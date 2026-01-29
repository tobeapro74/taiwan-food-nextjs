/**
 * 서버 사이드 LRU 캐시 구현
 * - 메모리 기반 캐싱으로 MongoDB 조회 최소화
 * - TTL 지원으로 자동 만료
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(maxSize: number = 500, defaultTTLMs: number = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTLMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTL 만료 체크
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // LRU: 최근 접근한 항목을 맨 뒤로 이동
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // 이미 존재하면 삭제 (순서 갱신을 위해)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 캐시 크기 초과 시 가장 오래된 항목 삭제
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const expiry = Date.now() + (ttlMs ?? this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 패턴 매칭으로 삭제
  invalidateByPattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  get size(): number {
    return this.cache.size;
  }

  // 캐시 통계
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// ============================================
// 캐시 인스턴스들
// ============================================

// 평점 캐시 (최대 1000개, 5분 TTL)
export const ratingCache = new LRUCache<{
  rating: number | null;
  reviewsCount: number | null;
}>(1000, 5 * 60 * 1000);

// 리뷰 캐시 (최대 500개, 1시간 TTL)
export const reviewCache = new LRUCache<{
  reviews: unknown[];
  rating: number | null;
  reviewsCount: number | null;
}>(500, 60 * 60 * 1000);

// 이미지 URL 캐시 (최대 500개, 24시간 TTL)
export const imageUrlCache = new LRUCache<string>(500, 24 * 60 * 60 * 1000);

// 맛집 데이터 캐시 (최대 200개, 10분 TTL)
export const restaurantCache = new LRUCache<unknown>(200, 10 * 60 * 1000);

// ============================================
// 캐시 유틸리티 함수
// ============================================

/**
 * 캐시 무효화 (모든 캐시)
 */
export function invalidateAllCaches(): void {
  ratingCache.clear();
  reviewCache.clear();
  imageUrlCache.clear();
  restaurantCache.clear();
}

/**
 * 특정 맛집의 모든 캐시 무효화
 */
export function invalidateRestaurantCache(restaurantName: string): void {
  ratingCache.delete(restaurantName);
  reviewCache.delete(restaurantName);
  imageUrlCache.delete(restaurantName);
  restaurantCache.invalidateByPattern(restaurantName);
}

/**
 * 캐시 통계 조회
 */
export function getCacheStats() {
  return {
    rating: ratingCache.getStats(),
    review: reviewCache.getStats(),
    imageUrl: imageUrlCache.getStats(),
    restaurant: restaurantCache.getStats(),
  };
}

// ============================================
// HTTP Cache-Control 헤더 유틸리티
// ============================================

export const CacheHeaders = {
  // 정적 데이터 (24시간)
  STATIC: {
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800',
  },

  // 이미지 (24시간, immutable)
  IMAGE: {
    'Cache-Control': 'public, max-age=86400, immutable',
  },

  // 평점/리뷰 (5분, stale-while-revalidate 10분)
  RATING: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  },

  // 리뷰 상세 (1시간)
  REVIEW: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
  },

  // 사용자 데이터 (캐시 안함)
  PRIVATE: {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
  },

  // 짧은 캐시 (1분)
  SHORT: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
  },
} as const;
