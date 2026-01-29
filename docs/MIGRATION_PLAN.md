# 대만맛집 앱 성능 최적화 마이그레이션 계획

## 현재 상태 분석 요약

| 항목 | 현재 상태 | 문제점 |
|------|----------|--------|
| **데이터베이스** | MongoDB (maxPoolSize: 10) | 인덱스 없음, TTL 인덱스 미적용 |
| **캐싱** | MongoDB 수동 캐시 (24시간) | 클라이언트 캐시 수동 관리, 페이지 새로고침 시 초기화 |
| **API 호출** | 32개 개별 API 라우트 | 중복 호출, 직렬 처리, RestaurantCard당 2개 요청 |
| **클라이언트** | 순수 fetch + useState | SWR/React Query 미사용, 재시도 로직 없음 |
| **렌더링** | 완전 CSR ("use client") | 초기 로딩 느림, SEO 약함 |

---

## Phase 1: MongoDB 인덱스 최적화

### 목표
- 데이터베이스 쿼리 성능 30-50% 향상
- 불필요한 풀 스캔 제거

### 작업 항목

#### 1.1 단일 필드 인덱스 생성
```javascript
// 실행: MongoDB Atlas 또는 mongosh

// google_reviews_cache - 가장 빈번한 조회
db.google_reviews_cache.createIndex({ "restaurantName": 1 })
db.google_reviews_cache.createIndex({ "placeId": 1 })

// custom_restaurants - 사용자 등록 맛집
db.custom_restaurants.createIndex({ "place_id": 1 }, { unique: true })
db.custom_restaurants.createIndex({ "name": 1 })
db.custom_restaurants.createIndex({ "category": 1 })

// reviews - 리뷰 조회
db.reviews.createIndex({ "restaurant_name": 1 })
db.reviews.createIndex({ "member_id": 1 })
db.reviews.createIndex({ "rating": -1 })

// members - 회원 조회
db.members.createIndex({ "id": 1 }, { unique: true })
db.members.createIndex({ "email": 1 }, { unique: true })

// restaurant_prices - 가격 정보
db.restaurant_prices.createIndex({ "restaurantName": 1 })

// image_cache - 이미지 캐시
db.image_cache.createIndex({ "restaurantName": 1 })

// 편의점 데이터
db.seven_eleven_stores.createIndex({ "poi_id": 1 }, { unique: true })
db.familymart_stores.createIndex({ "place_id": 1 }, { unique: true })

// 일정
db.schedules.createIndex({ "user_id": 1 })
db.schedules.createIndex({ "created_at": -1 })
```

#### 1.2 복합 인덱스 생성
```javascript
// 리뷰 조회 최적화 (맛집별 최신 리뷰)
db.reviews.createIndex({ "restaurant_name": 1, "created_at": -1 })

// 캐시 조회 최적화 (이름 + 만료시간)
db.google_reviews_cache.createIndex({ "restaurantName": 1, "updatedAt": -1 })

// 맛집 필터링 최적화
db.custom_restaurants.createIndex({ "category": 1, "name": 1 })
```

#### 1.3 TTL 인덱스 설정 (자동 캐시 정리)
```javascript
// 24시간 후 자동 삭제
db.google_reviews_cache.createIndex(
  { "updatedAt": 1 },
  { expireAfterSeconds: 86400 }  // 24시간
)

// 7일 후 자동 삭제 (이미지 캐시는 더 오래 유지)
db.image_cache.createIndex(
  { "createdAt": 1 },
  { expireAfterSeconds: 604800 }  // 7일
)
```

#### 1.4 지리공간 인덱스 (2dsphere)
```javascript
// 편의점 위치 기반 검색 최적화
db.seven_eleven_stores.createIndex({ "location": "2dsphere" })
db.familymart_stores.createIndex({ "location": "2dsphere" })
db.custom_restaurants.createIndex({ "location": "2dsphere" })
```

### 예상 효과
- `google_reviews_cache` 조회: ~50ms → ~5ms
- `custom_restaurants` 조회: ~30ms → ~3ms
- 캐시 자동 정리로 스토리지 비용 절감

### 마이그레이션 스크립트
```bash
# src/scripts/create-indexes.ts 파일로 생성
npm run create-indexes
```

---

## Phase 2: 캐싱 전략 강화

### 목표
- API 호출 50% 감소
- 페이지 로딩 속도 40% 향상

### 작업 항목

#### 2.1 HTTP Cache-Control 헤더 추가

```typescript
// src/app/api/ratings/route.ts
export async function POST(request: NextRequest) {
  // ... 기존 로직

  return NextResponse.json(
    { ratings: result },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        // 5분 캐시, 10분까지 stale 데이터 사용 가능
      },
    }
  );
}

// src/app/api/google-reviews/[name]/route.ts
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    // 1시간 캐시, 2시간까지 stale 데이터 사용 가능
  },
});

// src/app/api/place-photo/route.ts
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, max-age=86400, immutable',
    // 24시간 캐시, 불변 (이미지 URL은 변경되지 않음)
  },
});
```

#### 2.2 LRU 캐시 구현 (서버 사이드)

```typescript
// src/lib/cache.ts
import LRU from 'lru-cache';

// 리뷰 캐시 (최대 500개, 1시간 TTL)
export const reviewCache = new LRU<string, ReviewData>({
  max: 500,
  ttl: 1000 * 60 * 60, // 1시간
});

// 평점 캐시 (최대 1000개, 5분 TTL)
export const ratingCache = new LRU<string, RatingData>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5분
});

// 이미지 URL 캐시 (최대 500개, 24시간 TTL)
export const imageCache = new LRU<string, string>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24, // 24시간
});
```

#### 2.3 LocalStorage 캐시 (클라이언트)

```typescript
// src/lib/client-cache.ts

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export const clientCache = {
  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
  },

  get<T>(key: string): T | null {
    const raw = localStorage.getItem(`cache_${key}`);
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
    return entry.data;
  },

  invalidate(pattern: string): void {
    Object.keys(localStorage)
      .filter(key => key.startsWith(`cache_${pattern}`))
      .forEach(key => localStorage.removeItem(key));
  },
};
```

#### 2.4 Service Worker 캐싱 (PWA)

```typescript
// public/sw.js (Service Worker)
const CACHE_NAME = 'taiwan-food-v1';
const API_CACHE = 'api-cache-v1';

// 정적 자원 프리캐싱
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
];

// API 응답 캐싱 전략
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 요청은 Network First, 실패 시 캐시
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(API_CACHE).then(cache => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 정적 자원은 Cache First
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### 예상 효과
- 반복 방문 시 API 호출 70% 감소
- 오프라인 지원 (PWA)
- 네트워크 지연 체감 감소

---

## Phase 3: API 호출 통합

### 목표
- API 호출 횟수 60% 감소
- 네트워크 왕복 최소화

### 작업 항목

#### 3.1 배치 API 생성 (Batch API)

```typescript
// src/app/api/batch/route.ts
// 여러 맛집의 데이터를 한 번에 조회

interface BatchRequest {
  restaurants: string[];  // 맛집 이름 배열
  include: ('rating' | 'reviews' | 'photo')[];
}

export async function POST(request: NextRequest) {
  const { restaurants, include }: BatchRequest = await request.json();

  const results: Record<string, BatchResult> = {};

  await Promise.all(
    restaurants.map(async (name) => {
      const result: BatchResult = {};

      if (include.includes('rating')) {
        result.rating = await getRating(name);
      }
      if (include.includes('reviews')) {
        result.reviews = await getReviews(name);
      }
      if (include.includes('photo')) {
        result.photo = await getPhotoUrl(name);
      }

      results[name] = result;
    })
  );

  return NextResponse.json({ results });
}
```

#### 3.2 GraphQL 도입 (선택적)

```typescript
// src/app/api/graphql/route.ts
// 클라이언트가 필요한 필드만 요청

const typeDefs = `
  type Restaurant {
    name: String!
    rating: Float
    reviewsCount: Int
    photoUrl: String
    reviews(limit: Int): [Review]
  }

  type Query {
    restaurants(names: [String!]!): [Restaurant]
    restaurant(name: String!): Restaurant
  }
`;
```

#### 3.3 기존 API 통합

**변경 전 (RestaurantCard):**
```typescript
// 2개의 개별 API 호출
useEffect(() => {
  fetch(`/api/place-photo?query=${name}`);  // 호출 1
}, []);

useEffect(() => {
  fetch(`/api/google-reviews/${name}`);     // 호출 2
}, []);
```

**변경 후:**
```typescript
// 1개의 통합 API 호출
useEffect(() => {
  fetch('/api/batch', {
    method: 'POST',
    body: JSON.stringify({
      restaurants: [name],
      include: ['photo', 'rating']
    })
  });
}, []);
```

#### 3.4 페이지 단위 데이터 프리페칭

```typescript
// src/app/api/home-data/route.ts
// 홈 화면에 필요한 모든 데이터를 한 번에 조회

export async function GET() {
  const [popularRatings, marketRatings, customRestaurants] = await Promise.all([
    fetchRatings(POPULAR_RESTAURANTS),
    fetchRatings(MARKET_RESTAURANTS),
    fetchCustomRestaurants(),
  ]);

  return NextResponse.json({
    popular: popularRatings,
    market: marketRatings,
    custom: customRestaurants,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### API 호출 비교

| 화면 | 변경 전 | 변경 후 | 감소율 |
|------|---------|---------|--------|
| 홈 (10개 카드) | 20+ | 2 | 90% |
| 맛집 목록 (20개) | 40+ | 1 | 97% |
| 맛집 상세 | 3 | 1 | 67% |

---

## Phase 4: 클라이언트 최적화

### 목표
- 리렌더링 50% 감소
- 메모리 사용량 30% 감소
- UX 개선 (로딩 상태, 에러 처리)

### 작업 항목

#### 4.1 SWR 도입

```bash
npm install swr
```

```typescript
// src/hooks/useRatings.ts
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function useRatings(names: string[]) {
  const { data, error, isLoading, mutate } = useSWR(
    names.length > 0 ? ['/api/ratings', names] : null,
    ([url, names]) => fetch(url, {
      method: 'POST',
      body: JSON.stringify({ names })
    }).then(res => res.json()),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,  // 1분 동안 중복 요청 방지
      fallbackData: null,
    }
  );

  return {
    ratings: data?.ratings,
    isLoading,
    error,
    refresh: mutate,
  };
}

// src/hooks/useRestaurantData.ts
export function useRestaurantData(name: string) {
  const { data, error, isLoading } = useSWR(
    `/api/batch?name=${encodeURIComponent(name)}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,  // 5분
    }
  );

  return {
    rating: data?.rating,
    photoUrl: data?.photoUrl,
    reviews: data?.reviews,
    isLoading,
    error,
  };
}
```

#### 4.2 React Query 도입 (대안)

```bash
npm install @tanstack/react-query
```

```typescript
// src/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5분
      gcTime: 1000 * 60 * 30,    // 30분
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

#### 4.3 Virtual Scroll (가상 스크롤)

```bash
npm install @tanstack/react-virtual
```

```typescript
// src/components/restaurant-list-virtual.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualRestaurantList({ restaurants }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: restaurants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,  // 카드 높이 추정
    overscan: 5,              // 버퍼 아이템 수
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-200px)] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <RestaurantCard restaurant={restaurants[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4.4 React.memo 및 useMemo 최적화

```typescript
// src/components/restaurant-card.tsx
import { memo, useMemo } from 'react';

export const RestaurantCard = memo(function RestaurantCard({
  restaurant,
  onSelect,
}: Props) {
  const formattedRating = useMemo(() => {
    return restaurant.rating?.toFixed(1) ?? '-';
  }, [restaurant.rating]);

  const categoryBadge = useMemo(() => {
    return getCategoryBadge(restaurant.category);
  }, [restaurant.category]);

  return (
    // ... 컴포넌트 렌더링
  );
}, (prevProps, nextProps) => {
  // 커스텀 비교 함수
  return prevProps.restaurant.이름 === nextProps.restaurant.이름 &&
         prevProps.restaurant.rating === nextProps.restaurant.rating;
});
```

#### 4.5 Skeleton Loading

```typescript
// src/components/ui/skeleton-card.tsx
export function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border animate-pulse">
      <div className="h-32 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}

// 사용
{isLoading ? (
  Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
) : (
  restaurants.map(r => <RestaurantCard key={r.이름} restaurant={r} />)
)}
```

### 예상 효과
- 첫 렌더링 시간 40% 단축
- 스크롤 성능 대폭 향상 (100개+ 목록)
- 메모리 사용량 감소

---

## Phase 5: 서버 사이드 최적화

### 목표
- 초기 로딩 시간 50% 단축
- SEO 개선
- Edge 배포로 글로벌 지연 시간 감소

### 작업 항목

#### 5.1 ISR (Incremental Static Regeneration)

```typescript
// src/app/page.tsx
// 정적 데이터는 빌드 시 생성, 동적 데이터는 클라이언트에서

// 서버 컴포넌트로 정적 데이터 프리렌더링
export default async function HomePage() {
  // 빌드 시 정적 데이터 가져오기
  const staticRestaurants = await getStaticRestaurants();

  return (
    <main>
      <Suspense fallback={<HomePageSkeleton />}>
        {/* 클라이언트 컴포넌트에서 동적 데이터 처리 */}
        <HomeContent initialData={staticRestaurants} />
      </Suspense>
    </main>
  );
}

// ISR 설정 - 1시간마다 재생성
export const revalidate = 3600;
```

#### 5.2 서버 컴포넌트 + 클라이언트 컴포넌트 분리

```typescript
// src/app/restaurant/[name]/page.tsx (서버 컴포넌트)
export default async function RestaurantPage({
  params,
}: {
  params: { name: string };
}) {
  // 서버에서 데이터 프리페치
  const [restaurant, reviews] = await Promise.all([
    getRestaurant(params.name),
    getReviews(params.name),
  ]);

  return (
    <main>
      {/* 정적 컨텐츠는 서버에서 렌더링 */}
      <RestaurantHeader restaurant={restaurant} />

      {/* 인터랙티브 컨텐츠는 클라이언트 컴포넌트 */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewSection initialReviews={reviews} />
      </Suspense>
    </main>
  );
}

// 동적 메타데이터 생성
export async function generateMetadata({ params }): Promise<Metadata> {
  const restaurant = await getRestaurant(params.name);
  return {
    title: `${restaurant.이름} - 대만맛집`,
    description: `${restaurant.특징}. 위치: ${restaurant.위치}`,
    openGraph: {
      images: [restaurant.photoUrl],
    },
  };
}
```

#### 5.3 Edge Runtime 적용

```typescript
// src/app/api/ratings/route.ts
export const runtime = 'edge';  // Edge Runtime 사용
export const preferredRegion = ['icn1', 'hnd1'];  // 한국, 일본 리전

export async function POST(request: NextRequest) {
  // Edge에서 실행되는 가벼운 로직
  // MongoDB 대신 KV 스토어 사용 권장
}
```

#### 5.4 Vercel KV 캐시 (Edge 호환)

```typescript
// src/lib/edge-cache.ts
import { kv } from '@vercel/kv';

export async function getCachedRating(name: string): Promise<number | null> {
  return await kv.get(`rating:${name}`);
}

export async function setCachedRating(name: string, rating: number): Promise<void> {
  await kv.set(`rating:${name}`, rating, { ex: 3600 });  // 1시간 TTL
}
```

#### 5.5 이미지 최적화

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,  // 24시간
    deviceSizes: [640, 750, 828, 1080],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};
```

### 예상 효과
- First Contentful Paint: 3초 → 1.5초
- Time to Interactive: 5초 → 2.5초
- Lighthouse 점수: 60 → 90+

---

## 구현 일정 (권장)

| Phase | 작업 | 예상 소요 | 우선순위 |
|-------|------|----------|----------|
| **Phase 1** | MongoDB 인덱스 | 1일 | 🔴 높음 |
| **Phase 2** | 캐싱 전략 | 2-3일 | 🔴 높음 |
| **Phase 3** | API 통합 | 3-4일 | 🟡 중간 |
| **Phase 4** | 클라이언트 최적화 | 3-4일 | 🟡 중간 |
| **Phase 5** | 서버 최적화 | 4-5일 | 🟢 낮음 |

**총 예상 소요: 2-3주**

---

## 성능 측정 지표

### 측정 도구
- Lighthouse (Chrome DevTools)
- Vercel Analytics
- MongoDB Atlas Performance Advisor
- React DevTools Profiler

### 목표 지표

| 지표 | 현재 (추정) | 목표 |
|------|-------------|------|
| First Contentful Paint | 3.0s | 1.5s |
| Largest Contentful Paint | 5.0s | 2.5s |
| Time to Interactive | 6.0s | 3.0s |
| API 호출 수 (홈) | 20+ | 2-3 |
| 번들 크기 | - | < 200KB (gzip) |
| Lighthouse 성능 점수 | 60 | 90+ |

---

## 롤백 계획

각 Phase는 독립적으로 롤백 가능하도록 설계:

1. **Phase 1**: 인덱스 삭제 스크립트 준비
2. **Phase 2**: 캐시 비활성화 환경변수 추가
3. **Phase 3**: 기존 API 엔드포인트 유지 (deprecated 표시)
4. **Phase 4**: SWR/React Query 래퍼로 기존 fetch 유지
5. **Phase 5**: ISR 비활성화 (`export const dynamic = 'force-dynamic'`)

---

## 참고 자료

- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [SWR Documentation](https://swr.vercel.app/)
- [MongoDB Indexing Best Practices](https://www.mongodb.com/docs/manual/indexes/)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
