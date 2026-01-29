import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats, invalidateAllCaches, invalidateRestaurantCache } from '@/lib/cache';

// Edge Runtime 사용 (MongoDB 접근 없이 메모리 캐시만 조회)
export const runtime = 'edge';
export const preferredRegion = ['icn1', 'hnd1']; // 한국, 일본

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;

/**
 * 캐시 통계 조회 API
 * GET /api/cache-stats?key=ADMIN_SECRET_KEY
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!ADMIN_SECRET_KEY || key !== ADMIN_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  const stats = getCacheStats();

  return NextResponse.json({
    success: true,
    stats,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 캐시 무효화 API
 * POST /api/cache-stats?key=ADMIN_SECRET_KEY
 * Body: { type: 'all' | 'restaurant', name?: string }
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!ADMIN_SECRET_KEY || key !== ADMIN_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: '인증이 필요합니다.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { type, name } = body;

    if (type === 'all') {
      invalidateAllCaches();
      return NextResponse.json({
        success: true,
        message: '모든 메모리 캐시가 무효화되었습니다.',
      });
    }

    if (type === 'restaurant' && name) {
      invalidateRestaurantCache(name);
      return NextResponse.json({
        success: true,
        message: `${name} 캐시가 무효화되었습니다.`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'type과 name이 필요합니다.' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: '잘못된 요청입니다.' },
      { status: 400 }
    );
  }
}
