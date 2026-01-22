import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { CustomRestaurant, JWTPayload, RestaurantHistory } from '@/lib/types';
import { taiwanFoodMap, generateStaticPlaceId } from '@/data/taiwan-food';

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

// 정적 데이터에서 맛집 찾기
function findStaticRestaurant(placeId: string): { restaurant: typeof taiwanFoodMap['면류'][0]; category: string } | null {
  const cats = ['면류', '만두', '밥류', '탕류', '디저트', '길거리음식', '카페', '까르푸'] as const;

  for (const cat of cats) {
    const restaurants = taiwanFoodMap[cat] || [];
    for (const r of restaurants) {
      if (generateStaticPlaceId(r.이름, cat) === placeId) {
        return { restaurant: r, category: cat };
      }
    }
  }

  // 도심투어에서 검색
  for (const area of Object.keys(taiwanFoodMap.도심투어)) {
    const restaurants = taiwanFoodMap.도심투어[area] || [];
    for (const r of restaurants) {
      if (generateStaticPlaceId(r.이름, '도심투어') === placeId) {
        return { restaurant: r, category: '도심투어' };
      }
    }
  }

  // 갈만한 곳에서 검색
  const places = taiwanFoodMap['갈만한 곳'] || [];
  for (const r of places) {
    if (generateStaticPlaceId(r.이름, '갈만한곳') === placeId) {
      return { restaurant: r, category: '갈만한곳' };
    }
  }

  return null;
}

// 정적 데이터를 DB로 마이그레이션
async function migrateStaticToDb(
  placeId: string,
  decoded: JWTPayload
): Promise<CustomRestaurant | null> {
  const staticData = findStaticRestaurant(placeId);
  if (!staticData) return null;

  const { restaurant, category } = staticData;
  const db = await connectToDatabase();
  const collection = db.collection<CustomRestaurant>('custom_restaurants');

  const newRestaurant: Omit<CustomRestaurant, '_id'> = {
    place_id: placeId,
    name: restaurant.이름,
    address: restaurant.위치,
    category: category,
    feature: restaurant.특징 || '',
    coordinates: restaurant.coordinates || { lat: 25.0330, lng: 121.5654 },
    google_rating: restaurant.평점,
    google_reviews_count: restaurant.리뷰수,
    price_level: undefined,
    phone_number: restaurant.전화번호,
    opening_hours: undefined,
    photos: undefined,
    website: undefined,
    google_map_url: undefined,
    registered_by: decoded.userId,
    registered_by_name: decoded.name,
    created_at: new Date().toISOString(),
    building: restaurant.빌딩,
    night_market: restaurant.야시장,
  };

  await collection.insertOne(newRestaurant as CustomRestaurant);
  return newRestaurant as CustomRestaurant;
}

// 주소에서 간단한 지역명 추출 (구/동 단위)
function extractShortAddress(address: string): string {
  // 타이완 주소에서 District나 區 추출
  const districtMatch = address.match(/([^,]+(?:District|區)[^,]*)/i);
  if (districtMatch) {
    return districtMatch[1].trim();
  }
  // 콤마로 분리된 첫 번째 또는 두 번째 부분
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    return parts.slice(0, 2).join(', ');
  }
  return parts[0] || address.substring(0, 30);
}

// 히스토리 기록 함수
async function recordHistory(data: {
  place_id: string;
  name: string;
  address: string;
  category: string;
  registered_by: number;
  registered_by_name: string;
  action: 'register' | 'delete' | 'update';
  memo?: string;
}): Promise<void> {
  try {
    const db = await connectToDatabase();
    const historyCollection = db.collection<RestaurantHistory>('restaurant_history');

    // 다음 순번 가져오기
    const lastRecord = await historyCollection
      .find()
      .sort({ seq: -1 })
      .limit(1)
      .toArray();
    const seq = lastRecord.length > 0 ? lastRecord[0].seq + 1 : 1;

    const historyRecord: RestaurantHistory = {
      seq,
      place_id: data.place_id,
      name: data.name,
      short_address: extractShortAddress(data.address),
      category: data.category,
      registered_by: data.registered_by,
      registered_by_name: data.registered_by_name,
      registered_at: new Date().toISOString(),
      action: data.action,
      memo: data.memo,
    };

    await historyCollection.insertOne(historyRecord);
  } catch (error) {
    console.error('히스토리 기록 오류:', error);
    // 히스토리 기록 실패해도 메인 작업에 영향 없도록 에러를 던지지 않음
  }
}

// 사용자 등록 맛집 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const registeredBy = searchParams.get('registeredBy');
    const placeId = searchParams.get('place_id');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    const db = await connectToDatabase();
    const collection = db.collection<CustomRestaurant>('custom_restaurants');

    // 좌표 기반 검색 (100m 반경 내 중복 체크)
    if (lat && lng) {
      const targetLat = parseFloat(lat);
      const targetLng = parseFloat(lng);
      const threshold = 0.001; // 약 100m

      const nearbyRestaurants = await collection
        .find({
          'coordinates.lat': { $gte: targetLat - threshold, $lte: targetLat + threshold },
          'coordinates.lng': { $gte: targetLng - threshold, $lte: targetLng + threshold },
        })
        .toArray();

      return NextResponse.json({
        success: true,
        data: nearbyRestaurants,
      });
    }

    // 쿼리 빌드
    const query: Record<string, unknown> = {};
    if (placeId) {
      // place_id로 검색 (중복 확인용)
      query.place_id = placeId;
    }
    if (category && category !== '전체') {
      query.category = category;
    }
    if (registeredBy) {
      query.registered_by = parseInt(registeredBy);
    }

    // 삭제되지 않은 항목만 조회
    query.deleted = { $ne: true };

    const restaurants = await collection
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    // 삭제된 정적 데이터의 place_id 목록 조회 (정적 데이터 필터링용)
    const deletedStaticIds = await collection
      .find({ deleted: true, place_id: { $regex: /^static_/ } })
      .project({ place_id: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: restaurants,
      deletedStaticIds: deletedStaticIds.map(d => d.place_id),
    });
  } catch (error) {
    console.error('맛집 목록 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '맛집 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 맛집 등록
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

    const body = await request.json();
    const {
      place_id,
      name,
      address,
      category,
      feature,
      coordinates,
      google_rating,
      google_reviews_count,
      price_level,
      phone_number,
      opening_hours,
      photos,
      website,
      google_map_url,
    } = body;

    // 필수 필드 검증
    if (!place_id || !name || !address || !category || !coordinates) {
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<CustomRestaurant>('custom_restaurants');

    // 중복 체크 (같은 place_id로 이미 등록된 경우)
    const existing = await collection.findOne({ place_id });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 등록된 맛집입니다.', existingId: existing._id },
        { status: 409 }
      );
    }

    // 새 맛집 데이터 생성
    const newRestaurant: Omit<CustomRestaurant, '_id'> = {
      place_id,
      name,
      address,
      category,
      feature: feature || '',
      coordinates,
      google_rating,
      google_reviews_count,
      price_level,
      phone_number,
      opening_hours,
      photos,
      website,
      google_map_url,
      registered_by: decoded.userId,
      registered_by_name: decoded.name,
      created_at: new Date().toISOString(),
    };

    const result = await collection.insertOne(newRestaurant as CustomRestaurant);

    // 히스토리 기록
    await recordHistory({
      place_id,
      name,
      address,
      category,
      registered_by: decoded.userId,
      registered_by_name: decoded.name,
      action: 'register',
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId,
        ...newRestaurant,
      },
      message: '맛집이 등록되었습니다!',
    });
  } catch (error) {
    console.error('맛집 등록 오류:', error);
    return NextResponse.json(
      { success: false, error: '맛집 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 맛집 카테고리 수정 (등록자 또는 관리자만)
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { place_id, category } = body;

    if (!place_id || !category) {
      return NextResponse.json(
        { success: false, error: 'place_id와 category가 필요합니다.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<CustomRestaurant>('custom_restaurants');

    // 맛집 찾기
    let restaurant: CustomRestaurant | null = await collection.findOne({ place_id });

    // DB에 없고 정적 데이터인 경우 자동 마이그레이션
    if (!restaurant && place_id.startsWith('static_')) {
      // 관리자 또는 박병철만 정적 데이터 수정 가능
      if (!decoded.is_admin && decoded.name !== '박병철') {
        return NextResponse.json(
          { success: false, error: '정적 데이터 수정 권한이 없습니다.' },
          { status: 403 }
        );
      }

      const migrated = await migrateStaticToDb(place_id, decoded);
      if (!migrated) {
        return NextResponse.json(
          { success: false, error: '맛집을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      restaurant = migrated;
    }

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: '맛집을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (등록자 또는 관리자 또는 박병철만 수정 가능)
    if (restaurant.registered_by !== decoded.userId && !decoded.is_admin && decoded.name !== '박병철') {
      return NextResponse.json(
        { success: false, error: '수정 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 카테고리 업데이트
    await collection.updateOne(
      { place_id },
      { $set: { category, updated_at: new Date().toISOString() } }
    );

    // 히스토리 기록
    await recordHistory({
      place_id,
      name: restaurant.name,
      address: restaurant.address,
      category,
      registered_by: decoded.userId,
      registered_by_name: decoded.name,
      action: 'update',
      memo: `카테고리 변경: ${restaurant.category} → ${category}`,
    });

    return NextResponse.json({
      success: true,
      message: '카테고리가 수정되었습니다.',
      data: { place_id, category },
    });
  } catch (error) {
    console.error('맛집 카테고리 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: '카테고리 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 맛집 장소 정보 수정 (등록자 또는 관리자)
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const {
      old_place_id,  // 기존 place_id (수정 대상 식별용)
      new_place_id,  // 새로운 place_id
      name,
      address,
      feature,
      coordinates,
      google_rating,
      google_reviews_count,
      phone_number,
      opening_hours,
      photos,
      website,
      google_map_url,
    } = body;

    if (!old_place_id) {
      return NextResponse.json(
        { success: false, error: '수정할 맛집의 place_id가 필요합니다.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<CustomRestaurant>('custom_restaurants');

    // 기존 맛집 찾기
    let restaurant: CustomRestaurant | null = await collection.findOne({ place_id: old_place_id });

    // DB에 없고 정적 데이터인 경우 자동 마이그레이션
    if (!restaurant && old_place_id.startsWith('static_')) {
      // 관리자 또는 박병철만 정적 데이터 수정 가능
      if (!decoded.is_admin && decoded.name !== '박병철') {
        return NextResponse.json(
          { success: false, error: '정적 데이터 수정 권한이 없습니다.' },
          { status: 403 }
        );
      }

      const migrated = await migrateStaticToDb(old_place_id, decoded);
      if (!migrated) {
        return NextResponse.json(
          { success: false, error: '맛집을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      restaurant = migrated;
    }

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: '맛집을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (등록자 또는 관리자 또는 박병철만 수정 가능)
    if (restaurant.registered_by !== decoded.userId && !decoded.is_admin && decoded.name !== '박병철') {
      return NextResponse.json(
        { success: false, error: '수정 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 업데이트할 필드 준비
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // 변경된 필드 목록 (히스토리용)
    const changedFields: string[] = [];

    if (new_place_id) {
      updateFields.place_id = new_place_id;
      changedFields.push('place_id');
    }
    if (name) {
      updateFields.name = name;
      changedFields.push('이름');
    }
    if (address) {
      updateFields.address = address;
      changedFields.push('주소');
    }
    if (feature !== undefined) {
      updateFields.feature = feature;
      changedFields.push('특징');
    }
    if (coordinates) {
      updateFields.coordinates = coordinates;
      changedFields.push('좌표');
    }
    if (google_rating !== undefined) updateFields.google_rating = google_rating;
    if (google_reviews_count !== undefined) updateFields.google_reviews_count = google_reviews_count;
    if (phone_number !== undefined) {
      updateFields.phone_number = phone_number;
      changedFields.push('전화번호');
    }
    if (opening_hours !== undefined) {
      updateFields.opening_hours = opening_hours;
      changedFields.push('영업시간');
    }
    if (photos !== undefined) updateFields.photos = photos;
    if (website !== undefined) updateFields.website = website;
    if (google_map_url) updateFields.google_map_url = google_map_url;

    // 업데이트 실행
    await collection.updateOne(
      { place_id: old_place_id },
      { $set: updateFields }
    );

    // 히스토리 기록 (변경된 필드가 있을 때만)
    if (changedFields.length > 0) {
      await recordHistory({
        place_id: new_place_id || old_place_id,
        name: name || restaurant.name,
        address: address || restaurant.address,
        category: restaurant.category,
        registered_by: decoded.userId,
        registered_by_name: decoded.name,
        action: 'update',
        memo: `정보 수정: ${changedFields.join(', ')}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: '맛집 정보가 수정되었습니다.',
      data: { old_place_id, ...updateFields },
    });
  } catch (error) {
    console.error('맛집 장소 정보 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: '정보 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 맛집 삭제 (등록자 본인만)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json(
        { success: false, error: 'placeId가 필요합니다.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<CustomRestaurant>('custom_restaurants');

    // 맛집 찾기
    let restaurant: CustomRestaurant | null = await collection.findOne({ place_id: placeId });

    // DB에 없고 정적 데이터인 경우 자동 마이그레이션 후 삭제
    if (!restaurant && placeId.startsWith('static_')) {
      // 관리자 또는 박병철만 정적 데이터 삭제 가능
      if (!decoded.is_admin && decoded.name !== '박병철') {
        return NextResponse.json(
          { success: false, error: '정적 데이터 삭제 권한이 없습니다.' },
          { status: 403 }
        );
      }

      const migrated = await migrateStaticToDb(placeId, decoded);
      if (!migrated) {
        return NextResponse.json(
          { success: false, error: '맛집을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      restaurant = migrated;
    }

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: '맛집을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (등록자 또는 관리자 또는 박병철만 삭제 가능)
    if (restaurant.registered_by !== decoded.userId && !decoded.is_admin && decoded.name !== '박병철') {
      return NextResponse.json(
        { success: false, error: '삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // 정적 데이터인 경우 실제 삭제 대신 deleted 플래그 설정 (나중에 필터링용)
    if (placeId.startsWith('static_')) {
      await collection.updateOne(
        { place_id: placeId },
        { $set: { deleted: true, deleted_at: new Date().toISOString() } }
      );
    } else {
      await collection.deleteOne({ place_id: placeId });
    }

    // 히스토리 기록
    await recordHistory({
      place_id: placeId,
      name: restaurant.name,
      address: restaurant.address,
      category: restaurant.category,
      registered_by: decoded.userId,
      registered_by_name: decoded.name,
      action: 'delete',
    });

    return NextResponse.json({
      success: true,
      message: '맛집이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('맛집 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '맛집 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
