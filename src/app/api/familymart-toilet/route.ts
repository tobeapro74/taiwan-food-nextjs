import { NextRequest, NextResponse } from 'next/server';

interface FamilyMartStore {
  place_id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  opening_hours?: {
    open_now?: boolean;
  };
  distance?: number;
  distance_text?: string;
  distance_km?: number;
  google_maps_directions_url?: string;
}

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

// GET: 가까운 패밀리마트 검색 (Google Places API 사용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const limit = parseInt(searchParams.get('limit') || '5');
    const maxDistance = parseFloat(searchParams.get('maxDistance') || '3'); // 기본 3km

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: '위치 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 좌표입니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Places API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Google Places API - Nearby Search (패밀리마트 검색)
    // radius를 maxDistance(km)를 미터로 변환
    const radiusMeters = Math.min(maxDistance * 1000, 50000); // 최대 50km

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLat},${userLng}&radius=${radiusMeters}&type=convenience_store&keyword=FamilyMart&language=ko&key=${apiKey}`;

    const response = await fetch(placesUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json(
        { success: false, error: `Google API 오류: ${data.status}` },
        { status: 500 }
      );
    }

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        user_location: { lat: userLat, lng: userLng },
      });
    }

    // 결과 처리 및 거리 계산
    const stores: FamilyMartStore[] = data.results
      .map((place: {
        place_id: string;
        name: string;
        vicinity: string;
        geometry: { location: { lat: number; lng: number } };
        opening_hours?: { open_now?: boolean };
      }) => {
        const distance = calculateDistance(
          userLat,
          userLng,
          place.geometry.location.lat,
          place.geometry.location.lng
        );

        return {
          place_id: place.place_id,
          name: place.name,
          address: place.vicinity,
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
          },
          opening_hours: place.opening_hours,
          distance,
          distance_text: formatDistance(distance),
          distance_km: Math.round(distance * 1000) / 1000,
          google_maps_directions_url: `https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat},${place.geometry.location.lng}&travelmode=walking`,
        };
      })
      .filter((store: FamilyMartStore) => store.distance! <= maxDistance)
      .sort((a: FamilyMartStore, b: FamilyMartStore) => a.distance! - b.distance!)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: stores,
      total: stores.length,
      user_location: { lat: userLat, lng: userLng },
    });
  } catch (error) {
    console.error('Error fetching nearby FamilyMart:', error);
    return NextResponse.json(
      { success: false, error: '패밀리마트 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
