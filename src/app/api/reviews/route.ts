import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '@/lib/types';

const JWT_SECRET = process.env.JWT_SECRET || 'taiwan-food-secret-key';

// 리뷰 목록 조회 (식당별)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    const db = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');

    const query = restaurantId ? { restaurant_id: restaurantId } : {};
    const reviews = await reviewsCollection
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error('리뷰 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '리뷰 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 리뷰 작성
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return NextResponse.json(
        { success: false, error: '인증이 만료되었습니다. 다시 로그인해주세요.' },
        { status: 401 }
      );
    }

    const sessionData = {
      id: decoded.userId,
      name: decoded.name,
      is_admin: decoded.is_admin,
      profile_image: decoded.profile_image,
    };

    const {
      restaurant_id,
      rating,
      food_rating,
      service_rating,
      atmosphere_rating,
      content,
      photos,
      meal_type,
    } = await request.json();

    // 입력값 검증
    if (!restaurant_id || !rating) {
      return NextResponse.json(
        { success: false, error: '식당 ID와 별점은 필수입니다.' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: '별점은 1~5 사이여야 합니다.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');

    // 새 리뷰 ID 생성
    const maxIdDoc = await reviewsCollection.find({}).sort({ id: -1 }).limit(1).toArray();
    const newId = maxIdDoc.length > 0 ? (maxIdDoc[0].id || 0) + 1 : 1;

    const newReview = {
      id: newId,
      restaurant_id,
      member_id: sessionData.id,
      member_name: sessionData.name,
      member_profile_image: sessionData.profile_image || null,
      rating,
      food_rating: food_rating || null,
      service_rating: service_rating || null,
      atmosphere_rating: atmosphere_rating || null,
      content: content || '',
      photos: photos || [],
      meal_type: meal_type || null,
      created_at: new Date().toISOString(),
    };

    await reviewsCollection.insertOne(newReview);

    return NextResponse.json({
      success: true,
      message: '리뷰가 등록되었습니다.',
      data: newReview,
    });
  } catch (error) {
    console.error('리뷰 작성 오류:', error);
    return NextResponse.json(
      { success: false, error: '리뷰 작성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
