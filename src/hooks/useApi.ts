'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { localCache, CacheKeys, CacheTTL } from '@/lib/client-cache';

/**
 * SWR 기반 API Hooks
 * - 자동 캐싱 및 재검증
 * - 중복 요청 방지 (dedupe)
 * - 에러 재시도
 * - LocalStorage 캐시 연동
 */

// 기본 fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API 요청 실패: ${res.status}`);
  }
  return res.json();
};

// POST fetcher
const postFetcher = async ([url, body]: [string, unknown]) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API 요청 실패: ${res.status}`);
  }
  return res.json();
};

// SWR 기본 설정
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 1분 동안 중복 요청 방지
  errorRetryCount: 2,
};

// ============================================
// 평점 관련 Hooks
// ============================================

interface RatingData {
  rating: number | null;
  reviewsCount: number | null;
}

interface RatingsResponse {
  ratings: Record<string, { rating: number | null; userRatingsTotal: number | null }>;
}

/**
 * 여러 맛집의 평점 조회
 */
export function useRatings(names: string[]) {
  const { data, error, isLoading, mutate } = useSWR<RatingsResponse>(
    names.length > 0 ? ['/api/ratings', { names }] : null,
    postFetcher,
    {
      ...defaultConfig,
      dedupingInterval: CacheTTL.RATING,
      fallbackData: (() => {
        // LocalStorage에서 캐시 확인
        const cached = localCache.get<RatingsResponse>(CacheKeys.rating(names.join(',')));
        return cached || undefined;
      })(),
      onSuccess: (data) => {
        // LocalStorage에 캐시 저장
        localCache.set(CacheKeys.rating(names.join(',')), data, CacheTTL.RATING);
      },
    }
  );

  // 결과 변환
  const ratings: Record<string, RatingData> = {};
  if (data?.ratings) {
    for (const [name, value] of Object.entries(data.ratings)) {
      ratings[name] = {
        rating: value.rating,
        reviewsCount: value.userRatingsTotal,
      };
    }
  }

  return {
    ratings,
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// 홈 데이터 Hook
// ============================================

interface HomeDataResponse {
  success: boolean;
  data: {
    popularRatings: Record<string, RatingData>;
    marketRatings: Record<string, RatingData>;
    customRestaurants: CustomRestaurant[];
    timestamp: string;
  };
  cached: boolean;
}

interface CustomRestaurant {
  place_id: string;
  name: string;
  address: string;
  category: string;
  feature?: string;
  coordinates: { lat: number; lng: number };
  google_rating?: number;
  google_reviews_count?: number;
}

/**
 * 홈 화면 데이터 조회 (통합 API)
 */
export function useHomeData() {
  const { data, error, isLoading, mutate } = useSWR<HomeDataResponse>(
    '/api/home-data',
    fetcher,
    {
      ...defaultConfig,
      dedupingInterval: CacheTTL.HOME_DATA,
      fallbackData: (() => {
        const cached = localCache.get<HomeDataResponse>(CacheKeys.homeData());
        return cached || undefined;
      })(),
      onSuccess: (data) => {
        localCache.set(CacheKeys.homeData(), data, CacheTTL.HOME_DATA);
      },
    }
  );

  return {
    popularRatings: data?.data?.popularRatings || {},
    marketRatings: data?.data?.marketRatings || {},
    customRestaurants: data?.data?.customRestaurants || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// Batch API Hook
// ============================================

interface BatchResponse {
  success: boolean;
  results: Record<string, {
    rating?: RatingData;
    photo?: { photoUrl: string | null; isClosed?: boolean };
    reviews?: { reviews: unknown[]; rating: number | null; reviewsCount: number | null };
  }>;
}

/**
 * 배치 데이터 조회
 */
export function useBatchData(
  restaurants: string[],
  include: ('rating' | 'photo' | 'reviews')[]
) {
  const { data, error, isLoading, mutate } = useSWR<BatchResponse>(
    restaurants.length > 0 ? ['/api/batch', { restaurants, include }] : null,
    postFetcher,
    {
      ...defaultConfig,
      dedupingInterval: CacheTTL.RATING,
    }
  );

  return {
    results: data?.results || {},
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// 맛집 상세 데이터 Hook
// ============================================

interface ReviewsResponse {
  reviews: unknown[];
  rating: number | null;
  userRatingsTotal: number | null;
  placeId: string;
}

/**
 * 맛집 리뷰 조회
 */
export function useRestaurantReviews(name: string, placeId?: string) {
  const url = placeId
    ? `/api/google-reviews/${encodeURIComponent(name)}?placeId=${placeId}`
    : `/api/google-reviews/${encodeURIComponent(name)}`;

  const { data, error, isLoading, mutate } = useSWR<ReviewsResponse>(
    name ? url : null,
    fetcher,
    {
      ...defaultConfig,
      dedupingInterval: CacheTTL.REVIEWS,
      fallbackData: (() => {
        const cached = localCache.get<ReviewsResponse>(CacheKeys.reviews(name));
        return cached || undefined;
      })(),
      onSuccess: (data) => {
        localCache.set(CacheKeys.reviews(name), data, CacheTTL.REVIEWS);
      },
    }
  );

  return {
    reviews: data?.reviews || [],
    rating: data?.rating || null,
    reviewsCount: data?.userRatingsTotal || null,
    placeId: data?.placeId,
    isLoading,
    error,
    refresh: mutate,
  };
}

// ============================================
// 이미지 URL Hook
// ============================================

interface PhotoResponse {
  photoUrl: string | null;
  buildingName?: string;
  isClosed?: boolean;
  businessStatus?: string;
  cached?: boolean;
}

/**
 * 맛집 이미지 URL 조회
 */
export function useRestaurantPhoto(name: string, query?: string) {
  const searchQuery = query || name;
  const url = `/api/place-photo?query=${encodeURIComponent(searchQuery)}&name=${encodeURIComponent(name)}`;

  const { data, error, isLoading } = useSWR<PhotoResponse>(
    name ? url : null,
    fetcher,
    {
      ...defaultConfig,
      dedupingInterval: CacheTTL.PHOTO,
      fallbackData: (() => {
        const cached = localCache.get<PhotoResponse>(CacheKeys.photo(name));
        return cached || undefined;
      })(),
      onSuccess: (data) => {
        if (data?.photoUrl) {
          localCache.set(CacheKeys.photo(name), data, CacheTTL.PHOTO);
        }
      },
    }
  );

  return {
    photoUrl: data?.photoUrl || null,
    buildingName: data?.buildingName,
    isClosed: data?.isClosed || false,
    businessStatus: data?.businessStatus,
    isLoading,
    error,
  };
}

// ============================================
// 사용자 등록 맛집 Hook
// ============================================

interface CustomRestaurantsResponse {
  success: boolean;
  data: CustomRestaurant[];
}

/**
 * 사용자 등록 맛집 목록 조회
 */
export function useCustomRestaurants() {
  const { data, error, isLoading, mutate } = useSWR<CustomRestaurantsResponse>(
    '/api/custom-restaurants',
    fetcher,
    {
      ...defaultConfig,
      dedupingInterval: CacheTTL.CUSTOM_RESTAURANTS,
      fallbackData: (() => {
        const cached = localCache.get<CustomRestaurantsResponse>(CacheKeys.customRestaurants());
        return cached || undefined;
      })(),
      onSuccess: (data) => {
        localCache.set(CacheKeys.customRestaurants(), data, CacheTTL.CUSTOM_RESTAURANTS);
      },
    }
  );

  return {
    restaurants: data?.data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}
