// 회원 타입
export interface Member {
  _id?: string;
  id?: number;
  name: string;
  email?: string;
  password_hash: string;
  profile_image?: string;
  status: 'active' | 'inactive';
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
}

// 리뷰 타입
export interface Review {
  _id?: string;
  id?: number;
  restaurant_id: string;
  member_id: number;
  member_name: string;
  member_profile_image?: string;
  rating: number; // 1-5
  food_rating?: number; // 음식 별점
  service_rating?: number; // 서비스 별점
  atmosphere_rating?: number; // 분위기 별점
  content: string;
  photos?: string[]; // Cloudinary URLs
  meal_type?: '아침 식사' | '브런치' | '점심 식사' | '저녁 식사' | '기타';
  created_at: string;
  updated_at?: string;
}

// 식당 타입 (기존 데이터 구조)
export interface Restaurant {
  id: string;
  name: string;
  category: string;
  address: string;
  nightMarket?: string;
  tour?: string;
  feature: string;
  mustTry: string[];
  price: string;
  hours: string;
  googleMapUrl: string;
  imageUrl?: string;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 세션 타입
export interface SessionUser {
  id: number;
  name: string;
  email?: string;
  profile_image?: string;
  is_admin: boolean;
}

// JWT 페이로드 타입
export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  is_admin: boolean;
  profile_image?: string;
}

// 사용자 등록 맛집 타입 (구글맵에서 가져온 정보)
export interface CustomRestaurant {
  _id?: string;
  place_id: string; // Google Place ID
  name: string; // 식당 이름
  address: string; // 주소
  category: string; // 카테고리 (면류, 만두, 밥류 등)
  feature: string; // 특징/메모
  coordinates: {
    lat: number;
    lng: number;
  };
  google_rating?: number; // 구글 평점
  google_reviews_count?: number; // 구글 리뷰 수
  price_level?: number; // 가격대 (1-4)
  phone_number?: string; // 전화번호
  opening_hours?: string[]; // 영업시간
  photos?: string[]; // 사진 URL 목록
  website?: string; // 웹사이트
  google_map_url: string; // 구글맵 URL
  registered_by: number; // 등록한 사용자 ID
  registered_by_name: string; // 등록한 사용자 이름
  created_at: string;
  updated_at?: string;
}

// 맛집 등록 히스토리 타입
export interface RestaurantHistory {
  _id?: string;
  seq: number; // 순번 (자동 증가)
  place_id: string; // Google Place ID
  name: string; // 식당 이름
  short_address: string; // 간단한 장소 (구/동 단위)
  category: string; // 카테고리
  registered_by: number; // 등록한 사용자 ID
  registered_by_name: string; // 등록한 사용자 이름
  registered_at: string; // 등록 일시
  action: 'register' | 'delete' | 'update'; // 액션 유형
  memo?: string; // 메모 (삭제 사유 등)
}

// 7-ELEVEN 화장실 매장 타입
export interface SevenElevenToilet {
  _id?: string;
  poi_id: string; // 매장 고유 ID
  name: string; // 매장명 (예: 台場)
  address: string; // 주소
  city: string; // 도시 (예: 台北市)
  district: string; // 구 (예: 松山區)
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string; // 전화번호
  opening_hours: string; // 영업시간 (예: 24H, 07:00 ~ 21:00)
  opening_days: string; // 영업일 (예: 週六/日不營業)
  services: string[]; // 제공 서비스 목록
  has_toilet: boolean; // 화장실 유무
  created_at: string;
  updated_at: string;
}

// 7-ELEVEN API 응답 파싱용 타입
export interface SevenElevenApiStore {
  POIID: string;
  POIName: string;
  Address: string;
  X: string; // 경도
  Y: string; // 위도
  Telno: string;
  StoreImageTitle: string; // 서비스 목록 (콤마 구분)
  OP_DAY: string;
  OP_TIME: string;
}
