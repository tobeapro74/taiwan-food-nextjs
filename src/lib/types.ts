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
