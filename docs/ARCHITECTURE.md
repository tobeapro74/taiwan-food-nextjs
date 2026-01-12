# 아키텍처 문서

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         클라이언트                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Next.js App (CSR)                     │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│  │  │  홈    │  │ 목록    │  │ 상세    │  │ 리뷰    │    │   │
│  │  │ 화면   │  │ 화면    │  │ 화면    │  │ 모달    │    │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │   │
│  │       │           │           │           │            │   │
│  │       └───────────┴───────────┴───────────┘            │   │
│  │                       │                                 │   │
│  │              ┌────────┴────────┐                       │   │
│  │              │   State (React) │                       │   │
│  │              └─────────────────┘                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  /auth   │  │ /reviews │  │ /upload  │  │/place-   │        │
│  │          │  │          │  │          │  │  photo   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
└───────┼─────────────┼─────────────┼─────────────┼───────────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│  MongoDB  │  │  MongoDB  │  │Cloudinary │  │  Google   │
│  (Users)  │  │ (Reviews) │  │  (Image)  │  │  Places   │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
```

## 컴포넌트 구조

```
src/
├── app/
│   ├── api/                    # API Routes (Serverless Functions)
│   │   ├── auth/
│   │   │   ├── login/route.ts     # POST: 로그인
│   │   │   ├── logout/route.ts    # POST: 로그아웃
│   │   │   ├── register/route.ts  # POST: 회원가입
│   │   │   └── me/route.ts        # GET: 현재 사용자
│   │   ├── reviews/
│   │   │   ├── route.ts           # GET/POST: 리뷰 목록/작성
│   │   │   └── [id]/route.ts      # DELETE: 리뷰 삭제
│   │   ├── upload/route.ts        # POST: 이미지 업로드
│   │   └── place-photo/route.ts   # GET: Google Places 이미지 프록시
│   ├── globals.css             # 전역 스타일
│   ├── layout.tsx              # 루트 레이아웃
│   └── page.tsx                # 메인 페이지 (SPA 라우팅)
│
├── components/
│   ├── ui/                     # shadcn/ui 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx           # 바텀 시트 (모달)
│   │   ├── scroll-area.tsx
│   │   └── ...
│   ├── auth-modal.tsx          # 로그인/회원가입 모달
│   ├── bottom-nav.tsx          # 하단 네비게이션 (5탭)
│   ├── category-sheet.tsx      # 카테고리 선택 시트
│   ├── restaurant-card.tsx     # 맛집 카드
│   ├── restaurant-detail.tsx   # 맛집 상세
│   ├── restaurant-list.tsx     # 맛집 목록
│   ├── nearby-restaurants.tsx  # 주변 맛집 찾기
│   ├── google-reviews.tsx      # Google 리뷰 섹션
│   ├── review-modal.tsx        # 리뷰 작성 모달
│   └── review-section.tsx      # 리뷰 목록 섹션
│
├── hooks/
│   ├── useSwipeBack.ts         # iOS 스타일 스와이프 뒤로가기
│   └── useUserLocation.ts      # 사용자 위치 관리
│
├── data/
│   └── taiwan-food.ts          # 맛집 정적 데이터 + 헬퍼 함수
│
└── lib/
    ├── mongodb.ts              # MongoDB 연결
    ├── geo-utils.ts            # 위치/거리 계산 유틸리티
    ├── types.ts                # TypeScript 타입 정의
    └── utils.ts                # 유틸리티 (cn 함수)
```

## 데이터 흐름

### 1. 맛집 데이터 (정적)

```
taiwan-food.ts ──► getRestaurantsByCategory() ──► 컴포넌트
                 ──► getRestaurantsByMarket()
                 ──► getRestaurantsByTour()
                 ──► searchRestaurants()
                 ──► getPopularRestaurants()
```

- 맛집 데이터는 `taiwan-food.ts`에 정적으로 저장
- 카테고리: 면류, 밥류, 만두, 우육탕, 훠궈, 디저트, 길거리음식, 카페, 공차, 까르푸
- 야시장: 스린, 닝샤, 라오허제, 통화, 펑자, 단수이
- 도심투어: 시먼딩, 융캉제, 중산, 신이

### 2. 리뷰 데이터 (동적)

```
┌──────────┐     POST /api/reviews     ┌──────────┐
│ 클라이언트│ ─────────────────────────► │ MongoDB  │
│          │ ◄───────────────────────── │ reviews  │
└──────────┘     GET /api/reviews      └──────────┘
                ?restaurant_id=xxx
```

### 3. 이미지 업로드 흐름

```
┌──────────┐   리사이즈    ┌──────────┐  Base64   ┌──────────┐
│ 브라우저  │ ──(800px)──► │ Canvas   │ ────────► │ API Route│
│ 파일선택  │              │ JPEG 60% │           │ /upload  │
└──────────┘              └──────────┘           └────┬─────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │  Cloudinary  │
                                              │  CDN URL     │
                                              └──────────────┘
```

## 상태 관리

### 페이지 상태 (page.tsx)

```typescript
// 뷰 상태
currentView: "home" | "list" | "detail" | "nearby"
previousView: "home" | "list" | "nearby"  // 뒤로가기 추적용

// 탭 상태
activeTab: "home" | "category" | "market" | "tour" | "places" | "nearby"

// 시트(모달) 상태
categorySheetOpen: boolean
marketSheetOpen: boolean
tourSheetOpen: boolean

// 데이터 상태
selectedRestaurant: Restaurant | null
listTitle: string
listItems: Restaurant[]

// 검색 상태
searchQuery: string
showSuggestions: boolean

// 인증 상태
user: UserInfo | null
authModalOpen: boolean
```

### 컴포넌트 간 통신

```
page.tsx (상태 관리)
    │
    ├── BottomNav
    │   └── onTabChange(tab) → 탭 변경, 시트 열기
    │
    ├── CategorySheet
    │   └── onSelect(id) → 목록 화면으로 이동
    │
    ├── RestaurantList
    │   └── onSelect(restaurant) → 상세 화면으로 이동
    │
    ├── RestaurantDetail
    │   ├── onBack() → 이전 화면으로
    │   └── ReviewSection
    │       └── ReviewModal → API 호출
    │
    └── AuthModal
        └── onLoginSuccess(user) → 사용자 상태 업데이트
```

## 인증 흐름

```
┌─────────┐  POST /api/auth/login   ┌─────────┐
│ 클라이언트│ ────────────────────────► │   API   │
│         │                          │         │
│         │ ◄───────────────────────  │         │
│         │   Set-Cookie: auth_token │         │
└─────────┘   (JWT, httpOnly)        └────┬────┘
                                          │
                                          ▼
                                    ┌─────────┐
                                    │ MongoDB │
                                    │  users  │
                                    └─────────┘
```

### JWT 토큰 구조
```json
{
  "id": 1,
  "email": "user@example.com",
  "exp": 1234567890
}
```

## UI/UX 패턴

### 바텀 시트 (Sheet)
- Radix UI Dialog 기반
- `side="bottom"` 설정으로 하단에서 슬라이드 업
- `max-h-[70vh]`로 높이 제한
- 내부 콘텐츠 스크롤 가능

### 네비게이션 구조
```
홈 ─┬─► 인기 맛집 ───► 상세
    ├─► 야시장별 맛집 ─► 상세
    └─► 검색 결과 ────► 상세

카테고리 ─► 목록 ─► 상세
야시장 ───► 목록 ─► 상세
도심투어 ─► 목록 ─► 상세
맛집알리미 ─► 상세
```

### 뒤로가기 로직
- `previousView` 상태로 이전 화면 추적
- 홈 → 상세: 뒤로가기 시 홈으로
- 목록 → 상세: 뒤로가기 시 목록으로
- 맛집알리미 → 상세: 뒤로가기 시 맛집알리미로

### 스와이프 뒤로가기 (useSwipeBack)
```
┌─────────────────────────────────────┐
│  화면 왼쪽 가장자리 (30px)에서       │
│  터치 시작                          │
│                                     │
│  ──────► 오른쪽으로 스와이프        │
│                                     │
│  페이지 전체 슬라이드 + 오버레이     │
│                                     │
│  threshold(100px) 초과 시           │
│  → 뒤로가기 실행                    │
│  미만 시 → 원위치 복귀              │
└─────────────────────────────────────┘
```

## 배포 아키텍처

```
GitHub Repository
       │
       ▼ (git push)
┌─────────────────┐
│     Vercel      │
│  ┌───────────┐  │
│  │  Build    │  │
│  │  Next.js  │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Serverless│  │  ◄── API Routes
│  │ Functions │  │
│  └───────────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │   Edge    │  │  ◄── 정적 자산
│  │  Network  │  │
│  └───────────┘  │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  External APIs  │
├─────────────────┤
│ MongoDB Atlas   │
│ Cloudinary      │
│ Google Places   │
└─────────────────┘
```

## 성능 최적화

### 클라이언트 사이드
- 이미지 리사이즈 (800px, JPEG 60%)
- `URL.createObjectURL()` 메모리 효율성
- 검색 자동완성 디바운스

### 서버 사이드
- MongoDB 연결 풀링
- Cloudinary CDN 활용
- API Route 응답 캐싱

### 번들 최적화
- 컴포넌트 동적 임포트 (필요시)
- Tree shaking (Lucide Icons)
