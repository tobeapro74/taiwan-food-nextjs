import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SevenElevenToilet } from '@/lib/types';

// 두 좌표 간 거리 계산 (Haversine 공식, 단위: km)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 거리를 사람이 읽기 쉬운 형식으로 변환
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

// GET: 가까운 화장실 매장 검색
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const limit = parseInt(searchParams.get('limit') || '5');
    const maxDistance = parseFloat(searchParams.get('maxDistance') || '3'); // 기본 3km

    // 좌표 없이 전체 목록 요청
    if (!lat || !lng) {
      const db = await connectToDatabase();
      const collection = db.collection<SevenElevenToilet>('seven_eleven_toilets');

      const stores = await collection.find({}).toArray();

      return NextResponse.json({
        success: true,
        data: stores,
        total: stores.length,
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 좌표입니다.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection<SevenElevenToilet>('seven_eleven_toilets');

    // 모든 화장실 매장 가져오기
    const stores = await collection.find({}).toArray();

    // 거리 계산 및 정렬
    const storesWithDistance = stores
      .map(store => ({
        ...store,
        distance: calculateDistance(
          userLat,
          userLng,
          store.coordinates.lat,
          store.coordinates.lng
        ),
      }))
      .filter(store => store.distance <= maxDistance) // 최대 거리 필터
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    // 거리 포맷팅 및 구글맵 길찾기 URL 추가
    const result = storesWithDistance.map(store => ({
      ...store,
      distance_text: formatDistance(store.distance),
      distance_km: Math.round(store.distance * 1000) / 1000,
      google_maps_directions_url: `https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}&travelmode=walking`,
    }));

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
      user_location: { lat: userLat, lng: userLng },
    });
  } catch (error) {
    console.error('Error fetching nearby toilets:', error);
    return NextResponse.json(
      { success: false, error: '화장실 매장 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
