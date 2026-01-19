import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { RestaurantHistory } from '@/lib/types';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'taiwan-food-secret-key-2024';

interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  is_admin: boolean;
}

// 다음 순번 가져오기
async function getNextSeq(): Promise<number> {
  const db = await connectToDatabase();
  const collection = db.collection<RestaurantHistory>('restaurant_history');

  const lastRecord = await collection
    .find()
    .sort({ seq: -1 })
    .limit(1)
    .toArray();

  return lastRecord.length > 0 ? lastRecord[0].seq + 1 : 1;
}

// 히스토리 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const action = searchParams.get('action'); // register, delete, update

    const db = await connectToDatabase();
    const collection = db.collection<RestaurantHistory>('restaurant_history');

    // 필터 조건
    const filter: Record<string, unknown> = {};
    if (action) {
      filter.action = action;
    }

    // 전체 개수
    const total = await collection.countDocuments(filter);

    // 페이지네이션 적용하여 조회 (최신순)
    const history = await collection
      .find(filter)
      .sort({ seq: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('히스토리 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '히스토리 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 히스토리 수동 추가 (관리자용)
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
    const { place_id, name, short_address, category, action, memo } = body;

    if (!place_id || !name || !category || !action) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<RestaurantHistory>('restaurant_history');

    const seq = await getNextSeq();

    const historyRecord: RestaurantHistory = {
      seq,
      place_id,
      name,
      short_address: short_address || '',
      category,
      registered_by: decoded.userId,
      registered_by_name: decoded.name,
      registered_at: new Date().toISOString(),
      action,
      memo,
    };

    await collection.insertOne(historyRecord);

    return NextResponse.json({
      success: true,
      message: '히스토리가 추가되었습니다.',
      data: historyRecord,
    });
  } catch (error) {
    console.error('히스토리 추가 오류:', error);
    return NextResponse.json(
      { success: false, error: '히스토리 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 히스토리 자동 기록 함수 (다른 API에서 import하여 사용)
export async function recordHistory(data: {
  place_id: string;
  name: string;
  short_address: string;
  category: string;
  registered_by: number;
  registered_by_name: string;
  action: 'register' | 'delete' | 'update';
  memo?: string;
}): Promise<void> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection<RestaurantHistory>('restaurant_history');

    const seq = await getNextSeq();

    const historyRecord: RestaurantHistory = {
      seq,
      place_id: data.place_id,
      name: data.name,
      short_address: data.short_address,
      category: data.category,
      registered_by: data.registered_by,
      registered_by_name: data.registered_by_name,
      registered_at: new Date().toISOString(),
      action: data.action,
      memo: data.memo,
    };

    await collection.insertOne(historyRecord);
  } catch (error) {
    console.error('히스토리 자동 기록 오류:', error);
    // 히스토리 기록 실패해도 메인 작업에 영향 없도록 에러를 던지지 않음
  }
}
