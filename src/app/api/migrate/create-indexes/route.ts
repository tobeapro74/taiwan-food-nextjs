import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

interface IndexResult {
  collection: string;
  index: string;
  status: 'created' | 'exists' | 'error';
  message?: string;
}

export async function POST(request: NextRequest) {
  // 관리자 인증
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!ADMIN_SECRET_KEY || key !== ADMIN_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  const results: IndexResult[] = [];
  const db = await connectToDatabase();

  // 인덱스 생성 헬퍼 함수
  async function createIndex(
    collectionName: string,
    indexSpec: Record<string, 1 | -1 | '2dsphere' | 'text'>,
    options: { unique?: boolean; expireAfterSeconds?: number; name?: string } = {}
  ): Promise<IndexResult> {
    try {
      const collection = db.collection(collectionName);
      const indexName = options.name || Object.keys(indexSpec).join('_');

      // 기존 인덱스 확인
      const existingIndexes = await collection.indexes();
      const exists = existingIndexes.some(idx => idx.name === indexName);

      if (exists) {
        return {
          collection: collectionName,
          index: indexName,
          status: 'exists',
          message: '인덱스가 이미 존재합니다.',
        };
      }

      await collection.createIndex(indexSpec, { ...options, name: indexName });
      return {
        collection: collectionName,
        index: indexName,
        status: 'created',
        message: '인덱스가 생성되었습니다.',
      };
    } catch (error) {
      return {
        collection: collectionName,
        index: Object.keys(indexSpec).join('_'),
        status: 'error',
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      };
    }
  }

  // ==========================================
  // 1. google_reviews_cache 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('google_reviews_cache', { restaurantName: 1 }),
    await createIndex('google_reviews_cache', { placeId: 1 }),
    await createIndex('google_reviews_cache', { restaurantName: 1, updatedAt: -1 }, {
      name: 'restaurantName_updatedAt_compound',
    }),
    // TTL 인덱스 - 24시간 후 자동 삭제
    await createIndex('google_reviews_cache', { updatedAt: 1 }, {
      expireAfterSeconds: 86400, // 24시간
      name: 'updatedAt_ttl',
    })
  );

  // ==========================================
  // 2. custom_restaurants 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('custom_restaurants', { place_id: 1 }, { unique: true }),
    await createIndex('custom_restaurants', { name: 1 }),
    await createIndex('custom_restaurants', { category: 1 }),
    await createIndex('custom_restaurants', { category: 1, name: 1 }, {
      name: 'category_name_compound',
    })
  );

  // ==========================================
  // 3. reviews 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('reviews', { restaurant_name: 1 }),
    await createIndex('reviews', { member_id: 1 }),
    await createIndex('reviews', { user_id: 1 }),
    await createIndex('reviews', { rating: -1 }),
    await createIndex('reviews', { restaurant_name: 1, created_at: -1 }, {
      name: 'restaurant_createdAt_compound',
    })
  );

  // ==========================================
  // 4. members 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('members', { id: 1 }, { unique: true }),
    await createIndex('members', { email: 1 }, { unique: true })
  );

  // ==========================================
  // 5. restaurant_prices 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('restaurant_prices', { restaurantName: 1 })
  );

  // ==========================================
  // 6. image_cache 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('image_cache', { restaurantName: 1 }),
    // TTL 인덱스 - 7일 후 자동 삭제
    await createIndex('image_cache', { createdAt: 1 }, {
      expireAfterSeconds: 604800, // 7일
      name: 'createdAt_ttl',
    })
  );

  // ==========================================
  // 7. seven_eleven_stores 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('seven_eleven_stores', { poi_id: 1 }, { unique: true })
  );

  // ==========================================
  // 8. familymart_stores 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('familymart_stores', { place_id: 1 }, { unique: true })
  );

  // ==========================================
  // 9. schedules 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('schedules', { user_id: 1 }),
    await createIndex('schedules', { created_at: -1 })
  );

  // ==========================================
  // 10. restaurant_history 컬렉션 인덱스
  // ==========================================
  results.push(
    await createIndex('restaurant_history', { seq: -1 }),
    await createIndex('restaurant_history', { registered_at: -1 })
  );

  // 결과 요약
  const summary = {
    total: results.length,
    created: results.filter(r => r.status === 'created').length,
    exists: results.filter(r => r.status === 'exists').length,
    errors: results.filter(r => r.status === 'error').length,
  };

  return NextResponse.json({
    success: true,
    message: '인덱스 생성 완료',
    summary,
    results,
  });
}

// GET으로 현재 인덱스 상태 확인
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!ADMIN_SECRET_KEY || key !== ADMIN_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  const db = await connectToDatabase();
  const collections = [
    'google_reviews_cache',
    'custom_restaurants',
    'reviews',
    'members',
    'restaurant_prices',
    'image_cache',
    'seven_eleven_stores',
    'familymart_stores',
    'schedules',
    'restaurant_history',
  ];

  const indexInfo: Record<string, unknown[]> = {};

  for (const collName of collections) {
    try {
      const collection = db.collection(collName);
      indexInfo[collName] = await collection.indexes();
    } catch {
      indexInfo[collName] = [];
    }
  }

  return NextResponse.json({
    success: true,
    indexes: indexInfo,
  });
}
