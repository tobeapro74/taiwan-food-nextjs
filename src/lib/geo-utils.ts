/**
 * 위치 기반 거리 계산 유틸리티
 * Haversine 공식을 사용하여 두 GPS 좌표 간의 거리를 계산
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RestaurantWithDistance {
  restaurant: {
    이름: string;
    위치: string;
    특징: string;
    야시장?: string;
    평점?: number;
    리뷰수?: number;
    빌딩?: string;
    전화번호?: string;
    가격대?: string;
    coordinates?: Coordinates;
  };
  distance: number; // 미터 단위
  formattedDistance: string;
}

// 지구 반지름 (미터)
const EARTH_RADIUS_METERS = 6371000;

/**
 * 각도를 라디안으로 변환
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Haversine 공식을 사용하여 두 좌표 간의 거리를 계산 (미터 단위)
 * @param point1 첫 번째 좌표 (위도, 경도)
 * @param point2 두 번째 좌표 (위도, 경도)
 * @returns 거리 (미터)
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);
  const deltaLat = toRadians(point2.lat - point1.lat);
  const deltaLng = toRadians(point2.lng - point1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * 거리를 사람이 읽기 쉬운 형태로 변환
 * @param meters 거리 (미터)
 * @returns 포맷된 거리 문자열 (예: "150m", "1.2km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 맛집 목록을 현재 위치로부터의 거리순으로 정렬
 * @param restaurants 맛집 목록 (coordinates 필드 필요)
 * @param userLocation 사용자 현재 위치
 * @returns 거리 정보가 포함된 정렬된 맛집 목록
 */
export function sortByDistance<T extends { coordinates?: Coordinates }>(
  restaurants: T[],
  userLocation: Coordinates
): (T & { distance: number; formattedDistance: string })[] {
  // 좌표가 있는 맛집만 필터링
  const withCoords = restaurants.filter((r) => r.coordinates);

  // 거리 계산 및 정렬
  return withCoords
    .map((restaurant) => {
      const distance = calculateDistance(userLocation, restaurant.coordinates!);
      return {
        ...restaurant,
        distance,
        formattedDistance: formatDistance(distance),
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

/**
 * 특정 반경 내의 맛집만 필터링
 * @param restaurants 맛집 목록
 * @param userLocation 사용자 현재 위치
 * @param radiusMeters 반경 (미터)
 * @returns 반경 내 맛집 목록 (거리순 정렬)
 */
export function filterByRadius<T extends { coordinates?: Coordinates }>(
  restaurants: T[],
  userLocation: Coordinates,
  radiusMeters: number
): (T & { distance: number; formattedDistance: string })[] {
  const sorted = sortByDistance(restaurants, userLocation);
  return sorted.filter((r) => r.distance <= radiusMeters);
}

/**
 * Mock 위치 상수 (테스트용)
 */
export const MOCK_LOCATIONS: Record<string, Coordinates & { name: string }> = {
  타이베이역: { lat: 25.0478, lng: 121.5170, name: "타이베이역" },
  시먼딩: { lat: 25.0421, lng: 121.5074, name: "시먼딩 (행복당 근처)" },
  융캉제: { lat: 25.0330, lng: 121.5290, name: "융캉제" },
  중정기념당: { lat: 25.0350, lng: 121.5200, name: "중정기념당" },
  스린야시장: { lat: 25.0875, lng: 121.5245, name: "스린 야시장" },
  닝샤야시장: { lat: 25.0558, lng: 121.5155, name: "닝샤 야시장" },
  중산: { lat: 25.0527, lng: 121.5207, name: "중산역" },
  라오허제: { lat: 25.0505, lng: 121.5774, name: "라오허제 야시장" },
  난지창: { lat: 25.0325, lng: 121.5085, name: "난지창 야시장" },
};

/**
 * 반경 옵션 (미터)
 */
export const RADIUS_OPTIONS = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
  { value: 5000, label: "5km" },
];

/**
 * 주소 검색 결과 인터페이스
 */
export interface AddressSearchResult {
  displayName: string;
  lat: number;
  lng: number;
}

/**
 * 주소로 좌표 검색 (Nominatim OpenStreetMap API 사용 - 폴백용)
 * @param query 검색할 주소
 * @returns 검색 결과 목록
 */
export async function searchAddressToCoordinatesOSM(
  query: string
): Promise<AddressSearchResult[]> {
  // 대만 지역으로 제한하여 검색
  const encodedQuery = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&countrycodes=tw&limit=5&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "ko,zh-TW,en",
        "User-Agent": "TaiwanFoodApp/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`검색 실패: ${response.status}`);
    }

    const data = await response.json();

    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error("OSM 주소 검색 오류:", error);
    throw error;
  }
}

/**
 * Google Places API를 사용한 주소 검색 (서버 API Route 통해 호출)
 * @param query 검색할 주소
 * @returns 검색 결과 목록
 */
export async function searchAddressWithGoogle(
  query: string
): Promise<AddressSearchResult[]> {
  try {
    const response = await fetch("/api/places-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();

    // API 키가 없거나 오류 시 OSM으로 폴백
    if (data.useOSM || data.error) {
      console.warn("Google API 사용 불가, OSM으로 폴백:", data.error);
      return searchAddressToCoordinatesOSM(query);
    }

    // 결과가 없으면 OSM으로 폴백
    if (!data.results || data.results.length === 0) {
      return searchAddressToCoordinatesOSM(query);
    }

    return data.results;
  } catch (error) {
    console.error("Google Places API 호출 오류:", error);
    // 오류 시 OSM으로 폴백
    return searchAddressToCoordinatesOSM(query);
  }
}

/**
 * 주소로 좌표 검색 (Google Places 우선 시도, 실패시 OSM 폴백)
 * @param query 검색할 주소
 * @returns 검색 결과 목록
 */
export async function searchAddressToCoordinates(
  query: string
): Promise<AddressSearchResult[]> {
  // Google API Route를 먼저 시도, 실패하면 자동으로 OSM 폴백
  return searchAddressWithGoogle(query);
}
