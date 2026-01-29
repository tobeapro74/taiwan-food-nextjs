/**
 * 클라이언트 사이드 캐시 유틸리티
 * - LocalStorage 기반 영구 캐시
 * - SessionStorage 기반 세션 캐시
 * - 메모리 캐시 (페이지 새로고침 시 초기화)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================
// LocalStorage 캐시 (영구 저장)
// ============================================

const CACHE_PREFIX = 'tw_cache_';
const CACHE_VERSION = 'v1';

export const localCache = {
  /**
   * 캐시 저장
   * @param key 캐시 키
   * @param data 저장할 데이터
   * @param ttlMs TTL (밀리초), 기본 5분
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    if (typeof window === 'undefined') return;

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMs,
      };
      const cacheKey = `${CACHE_PREFIX}${CACHE_VERSION}_${key}`;
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      // QuotaExceededError 등 처리
      console.warn('LocalStorage 캐시 저장 실패:', error);
      // 용량 초과 시 오래된 캐시 정리
      this.cleanup();
    }
  },

  /**
   * 캐시 조회
   * @param key 캐시 키
   * @returns 캐시된 데이터 또는 null
   */
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const cacheKey = `${CACHE_PREFIX}${CACHE_VERSION}_${key}`;
      const raw = localStorage.getItem(cacheKey);

      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      // TTL 만료 체크
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  /**
   * 캐시 삭제
   */
  delete(key: string): void {
    if (typeof window === 'undefined') return;
    const cacheKey = `${CACHE_PREFIX}${CACHE_VERSION}_${key}`;
    localStorage.removeItem(cacheKey);
  },

  /**
   * 패턴 매칭으로 캐시 삭제
   */
  invalidateByPattern(pattern: string): number {
    if (typeof window === 'undefined') return 0;

    let count = 0;
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX) && key.includes(pattern)) {
        localStorage.removeItem(key);
        count++;
      }
    }

    return count;
  },

  /**
   * 만료된 캐시 정리
   */
  cleanup(): number {
    if (typeof window === 'undefined') return 0;

    let count = 0;
    const now = Date.now();
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (!key.startsWith(CACHE_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const entry: CacheEntry<unknown> = JSON.parse(raw);
        if (now - entry.timestamp > entry.ttl) {
          localStorage.removeItem(key);
          count++;
        }
      } catch {
        // 파싱 실패 시 삭제
        localStorage.removeItem(key);
        count++;
      }
    }

    return count;
  },

  /**
   * 모든 캐시 삭제
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  },
};

// ============================================
// 메모리 캐시 (세션 동안만 유지)
// ============================================

const memoryCache = new Map<string, CacheEntry<unknown>>();

export const memCache = {
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    memoryCache.set(key, entry);
  },

  get<T>(key: string): T | null {
    const entry = memoryCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      memoryCache.delete(key);
      return null;
    }

    return entry.data;
  },

  delete(key: string): void {
    memoryCache.delete(key);
  },

  clear(): void {
    memoryCache.clear();
  },

  get size(): number {
    return memoryCache.size;
  },
};

// ============================================
// 캐시 키 생성 유틸리티
// ============================================

export const CacheKeys = {
  rating: (name: string) => `rating_${encodeURIComponent(name)}`,
  reviews: (name: string) => `reviews_${encodeURIComponent(name)}`,
  photo: (name: string) => `photo_${encodeURIComponent(name)}`,
  restaurant: (name: string) => `restaurant_${encodeURIComponent(name)}`,
  homeData: () => 'home_data',
  customRestaurants: () => 'custom_restaurants',
};

// ============================================
// 캐시 TTL 상수 (밀리초)
// ============================================

export const CacheTTL = {
  RATING: 5 * 60 * 1000,        // 5분
  REVIEWS: 60 * 60 * 1000,      // 1시간
  PHOTO: 24 * 60 * 60 * 1000,   // 24시간
  HOME_DATA: 5 * 60 * 1000,     // 5분
  CUSTOM_RESTAURANTS: 10 * 60 * 1000, // 10분
} as const;

// ============================================
// 캐시 with fallback 유틸리티
// ============================================

/**
 * 캐시 우선 조회, 없으면 fetch 후 캐시
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = CacheTTL.RATING
): Promise<T> {
  // 1. 메모리 캐시 확인
  const memCached = memCache.get<T>(key);
  if (memCached !== null) {
    return memCached;
  }

  // 2. LocalStorage 캐시 확인
  const localCached = localCache.get<T>(key);
  if (localCached !== null) {
    // 메모리 캐시에도 저장
    memCache.set(key, localCached, ttlMs);
    return localCached;
  }

  // 3. 실제 fetch
  const data = await fetcher();

  // 4. 양쪽 캐시에 저장
  memCache.set(key, data, ttlMs);
  localCache.set(key, data, ttlMs);

  return data;
}
