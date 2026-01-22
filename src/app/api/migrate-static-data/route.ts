import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { CustomRestaurant, JWTPayload } from '@/lib/types';
import { taiwanFoodMap, categories } from '@/data/taiwan-food';

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

// 카테고리 ID 매핑
const categoryMap: Record<string, string> = {
  '면류': '면류',
  '만두': '만두',
  '밥류': '밥류',
  '탕류': '탕류',
  '디저트': '디저트',
  '길거리음식': '길거리음식',
  '카페': '카페',
  '까르푸': '까르푸',
};

// 정적 데이터를 DB로 마이그레이션
export async function POST(request: NextRequest) {
  try {
    // JWT 토큰 확인
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 토큰 검증
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return NextResponse.json(
        { success: false, error: '인증이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    // 관리자 또는 박병철만 실행 가능
    if (!decoded.is_admin && decoded.name !== '박병철') {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<CustomRestaurant>('custom_restaurants');

    const cats = ['면류', '만두', '밥류', '탕류', '디저트', '길거리음식', '카페', '까르푸'] as const;

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const cat of cats) {
      const restaurants = taiwanFoodMap[cat] || [];

      for (const restaurant of restaurants) {
        // place_id 생성 (이름 기반 고유 ID)
        const place_id = `static_${restaurant.이름.replace(/\s+/g, '_').toLowerCase()}_${cat}`;

        // 이미 존재하는지 확인
        const existing = await collection.findOne({ place_id });
        if (existing) {
          skipped++;
          continue;
        }

        // 새 맛집 데이터 생성
        const newRestaurant: Omit<CustomRestaurant, '_id'> = {
          place_id,
          name: restaurant.이름,
          address: restaurant.위치,
          category: categoryMap[cat] || cat,
          feature: restaurant.특징 || '',
          coordinates: restaurant.coordinates || { lat: 25.0330, lng: 121.5654 }, // 기본 좌표 (타이베이)
          google_rating: restaurant.평점,
          google_reviews_count: restaurant.리뷰수,
          price_level: restaurant.가격대 ? getPriceLevel(restaurant.가격대) : undefined,
          phone_number: restaurant.전화번호,
          opening_hours: undefined,
          photos: undefined,
          website: undefined,
          google_map_url: undefined,
          registered_by: decoded.userId,
          registered_by_name: decoded.name,
          created_at: new Date().toISOString(),
          // 추가 정보 저장
          building: restaurant.빌딩,
          night_market: restaurant.야시장,
        };

        try {
          await collection.insertOne(newRestaurant as CustomRestaurant);
          migrated++;
        } catch (err) {
          errors.push(`${restaurant.이름}: ${err}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `마이그레이션 완료: ${migrated}개 추가, ${skipped}개 건너뜀`,
      data: {
        migrated,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('마이그레이션 오류:', error);
    return NextResponse.json(
      { success: false, error: '마이그레이션 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 가격대 문자열을 숫자로 변환
function getPriceLevel(priceRange: string): number | undefined {
  if (priceRange.includes('100 이하') || priceRange.includes('저렴')) return 1;
  if (priceRange.includes('100~300') || priceRange.includes('보통')) return 2;
  if (priceRange.includes('300~600') || priceRange.includes('비쌈')) return 3;
  if (priceRange.includes('600 이상') || priceRange.includes('매우')) return 4;
  return undefined;
}

// 마이그레이션 상태 확인
export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection<CustomRestaurant>('custom_restaurants');

    // 정적 데이터로 마이그레이션된 맛집 수
    const staticCount = await collection.countDocuments({
      place_id: { $regex: /^static_/ }
    });

    // 전체 맛집 수
    const totalCount = await collection.countDocuments();

    // 카테고리별 통계
    const categoryStats = await collection.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: {
        staticMigrated: staticCount,
        total: totalCount,
        categoryStats,
      },
    });
  } catch (error) {
    console.error('상태 확인 오류:', error);
    return NextResponse.json(
      { success: false, error: '상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
