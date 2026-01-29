# 대만맛집 앱 마이그레이션 적용 가이드

이 문서는 성능 최적화 마이그레이션을 실제로 적용하는 방법을 설명합니다.

---

## 1. 패키지 설치

```bash
# 새로 추가된 패키지 설치
npm install swr @tanstack/react-virtual
```

---

## 2. MongoDB 인덱스 생성

### 방법 1: API를 통한 인덱스 생성 (권장)

```bash
# 인덱스 생성 (POST)
curl -X POST "https://your-domain.vercel.app/api/migrate/create-indexes?key=YOUR_ADMIN_SECRET_KEY"

# 현재 인덱스 상태 확인 (GET)
curl "https://your-domain.vercel.app/api/migrate/create-indexes?key=YOUR_ADMIN_SECRET_KEY"
```

### 방법 2: MongoDB Atlas 콘솔에서 직접 생성

MongoDB Atlas Dashboard > Collections > 각 컬렉션에서 Indexes 탭 선택

---

## 3. 생성된 파일 목록

### Phase 1: 인덱스 최적화
- `src/app/api/migrate/create-indexes/route.ts` - 인덱스 생성 API

### Phase 2: 캐싱 전략
- `src/lib/cache.ts` - 서버 사이드 LRU 캐시
- `src/lib/client-cache.ts` - 클라이언트 캐시 (LocalStorage)

### Phase 3: API 통합
- `src/app/api/batch/route.ts` - 배치 API
- `src/app/api/home-data/route.ts` - 홈 화면 통합 API

### Phase 4: 클라이언트 최적화
- `src/hooks/useApi.ts` - SWR 기반 커스텀 Hooks
- `src/components/ui/skeleton.tsx` - Skeleton 로딩 컴포넌트 (업데이트)
- `src/components/virtual-restaurant-list.tsx` - Virtual Scroll 컴포넌트

### Phase 5: 서버 최적화
- `src/app/api/cache-stats/route.ts` - Edge Runtime 캐시 통계 API
- `next.config.ts` - 이미지 최적화 및 헤더 설정 (업데이트)

### 수정된 기존 파일
- `src/app/api/ratings/route.ts` - 메모리 캐시 + HTTP 헤더 추가
- `src/app/api/place-photo/route.ts` - 메모리 캐시 + HTTP 헤더 추가
- `package.json` - 새 패키지 추가

---

## 4. 사용 방법

### 4.1 SWR Hooks 사용 예시

```tsx
'use client';

import { useHomeData, useRatings, useRestaurantPhoto } from '@/hooks/useApi';

function HomePage() {
  // 홈 데이터 (인기 맛집 + 야시장 + 사용자 등록 맛집)
  const { popularRatings, marketRatings, customRestaurants, isLoading } = useHomeData();

  if (isLoading) return <HomePageSkeleton />;

  return (
    <div>
      {/* 데이터 사용 */}
    </div>
  );
}

function RestaurantCard({ name }: { name: string }) {
  // 개별 맛집 이미지
  const { photoUrl, isLoading: photoLoading } = useRestaurantPhoto(name);

  return (
    <div>
      {photoLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <img src={photoUrl || '/placeholder.jpg'} alt={name} />
      )}
    </div>
  );
}
```

### 4.2 배치 API 사용 예시

```tsx
import { useBatchData } from '@/hooks/useApi';

function RestaurantList({ names }: { names: string[] }) {
  // 여러 맛집의 평점 + 사진을 한 번에 조회
  const { results, isLoading } = useBatchData(names, ['rating', 'photo']);

  if (isLoading) return <RestaurantListSkeleton />;

  return (
    <div>
      {names.map(name => (
        <div key={name}>
          <span>{name}</span>
          <span>평점: {results[name]?.rating?.rating}</span>
          <img src={results[name]?.photo?.photoUrl} />
        </div>
      ))}
    </div>
  );
}
```

### 4.3 Virtual Scroll 사용 예시

```tsx
import { VirtualGrid } from '@/components/virtual-restaurant-list';
import { RestaurantCard } from '@/components/restaurant-card';

function LongRestaurantList({ restaurants }) {
  return (
    <VirtualGrid
      restaurants={restaurants}
      onSelect={(r) => console.log(r)}
      renderItem={(restaurant, index) => (
        <RestaurantCard
          key={restaurant.이름}
          restaurant={restaurant}
        />
      )}
    />
  );
}
```

### 4.4 클라이언트 캐시 사용 예시

```tsx
import { localCache, CacheKeys, CacheTTL, cachedFetch } from '@/lib/client-cache';

// 직접 캐시 사용
const cachedRating = localCache.get(CacheKeys.rating('딩타이펑'));

// 캐시 with fallback
const data = await cachedFetch(
  CacheKeys.rating('딩타이펑'),
  () => fetch('/api/ratings', { method: 'POST', body: JSON.stringify({ names: ['딩타이펑'] }) }),
  CacheTTL.RATING
);
```

---

## 5. 캐시 관리

### 캐시 통계 확인

```bash
curl "https://your-domain.vercel.app/api/cache-stats?key=YOUR_ADMIN_SECRET_KEY"
```

### 캐시 무효화

```bash
# 모든 캐시 무효화
curl -X POST "https://your-domain.vercel.app/api/cache-stats?key=YOUR_ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "all"}'

# 특정 맛집 캐시만 무효화
curl -X POST "https://your-domain.vercel.app/api/cache-stats?key=YOUR_ADMIN_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "restaurant", "name": "딩타이펑"}'
```

---

## 6. 환경 변수

```env
# 기존 환경 변수
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=taiwan_food
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=...
CLOUDINARY_URL=cloudinary://...
JWT_SECRET=...
ADMIN_SECRET_KEY=...  # 인덱스 생성 및 캐시 관리에 사용
```

---

## 7. 성능 측정

### Lighthouse 테스트

```bash
# Chrome DevTools > Lighthouse 탭
# 또는 CLI
npx lighthouse https://your-domain.vercel.app --view
```

### 목표 지표

| 지표 | 이전 | 목표 |
|------|------|------|
| First Contentful Paint | 3.0s | 1.5s |
| Largest Contentful Paint | 5.0s | 2.5s |
| Time to Interactive | 6.0s | 3.0s |
| Lighthouse 성능 점수 | 60 | 90+ |

---

## 8. 롤백 방법

### 캐시 비활성화
환경 변수 `DISABLE_CACHE=true` 설정 시 메모리 캐시 우회 가능 (필요시 구현)

### 기존 API 사용
새 API(`/api/batch`, `/api/home-data`)를 사용하지 않고 기존 API 유지 가능

### SWR 제거
`useApi.ts` 대신 기존 `useState` + `useEffect` 패턴 사용

---

## 9. 다음 단계 (선택)

1. **Vercel KV 도입**: Edge Runtime에서 MongoDB 대신 KV 스토어 사용
2. **ISR 페이지 전환**: 주요 페이지를 서버 컴포넌트로 전환
3. **React Query 마이그레이션**: SWR 대신 React Query 사용 (더 많은 기능)
4. **PWA 캐시 강화**: Service Worker 캐싱 전략 구현

---

## 참고 문서

- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [SWR Documentation](https://swr.vercel.app/)
- [MongoDB Indexing](https://www.mongodb.com/docs/manual/indexes/)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
