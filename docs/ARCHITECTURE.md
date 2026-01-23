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
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│  MongoDB  │  │  MongoDB  │  │  MongoDB  │  │Cloudinary │  │  Google   │  │  Resend   │
│  (Users)  │  │ (Reviews) │  │ (Stores)  │  │  (Image)  │  │  Places   │  │  (Email)  │
└───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

## 컴포넌트 구조

```
src/
├── app/
│   ├── api/                       # API Routes (Serverless Functions)
│   │   ├── auth/
│   │   │   ├── login/route.ts        # POST: 로그인
│   │   │   ├── logout/route.ts       # POST: 로그아웃
│   │   │   ├── register/route.ts     # POST: 회원가입
│   │   │   ├── me/route.ts           # GET: 현재 사용자
│   │   │   ├── delete-account/route.ts # DELETE: 계정 삭제
│   │   │   ├── send-verification/route.ts # POST: 인증 코드 발송
│   │   │   └── verify-code/route.ts  # POST: 인증 코드 확인
│   │   ├── reviews/
│   │   │   ├── route.ts              # GET/POST: 리뷰 목록/작성
│   │   │   └── [id]/route.ts         # PUT/DELETE: 리뷰 수정/삭제
│   │   ├── custom-restaurants/
│   │   │   └── route.ts              # GET/POST/PATCH/PUT/DELETE: 사용자 맛집 (정적 데이터 자동 마이그레이션)
│   │   ├── migrate-static-data/
│   │   │   └── route.ts              # POST: 정적 데이터 일괄 마이그레이션
│   │   ├── reverse-geocode/
│   │   │   └── route.ts              # POST: 좌표→주소 변환 (역지오코딩)
│   │   ├── google-place-details/
│   │   │   └── route.ts              # GET/POST: Google Places 장소 검색/상세
│   │   ├── restaurant-history/
│   │   │   └── route.ts              # GET/POST: 등록 히스토리
│   │   ├── ratings/route.ts          # POST: 실시간 평점 조회
│   │   ├── upload/route.ts           # POST: 이미지 업로드
│   │   ├── place-photo/route.ts      # GET: Google Places 이미지 프록시
│   │   ├── restaurant-prices/[name]/route.ts # GET: 가격/전화번호 조회
│   │   ├── seven-eleven-toilet/route.ts # GET: 7-ELEVEN 화장실 검색
│   │   ├── familymart-toilet/route.ts # GET: FamilyMart 매장 검색
│   │   └── cron/
│   │       ├── refresh-reviews/route.ts # GET: 리뷰 정보 갱신 (Cron)
│   │       ├── sync-seven-eleven/route.ts # GET: 7-ELEVEN 동기화 (Cron)
│   │       └── sync-familymart/route.ts # GET: FamilyMart 동기화 (Cron)
│   ├── globals.css                # 전역 스타일
│   ├── layout.tsx                 # 루트 레이아웃
│   └── page.tsx                   # 메인 페이지 (SPA 라우팅)
│
├── components/
│   ├── ui/                        # shadcn/ui 컴포넌트
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx              # 바텀 시트 (모달)
│   │   ├── scroll-area.tsx
│   │   └── ...
│   ├── auth-modal.tsx             # 로그인/회원가입 모달 (이메일 인증)
│   ├── bottom-nav.tsx             # 하단 네비게이션 (5탭)
│   ├── category-sheet.tsx         # 카테고리 선택 시트
│   ├── category-edit-modal.tsx    # 카테고리 수정 모달
│   ├── restaurant-edit-modal.tsx  # 맛집 정보 수정 모달 (주소/좌표 자동변환)
│   ├── add-restaurant-modal.tsx   # 맛집 등록 모달
│   ├── restaurant-card.tsx        # 맛집 카드
│   ├── restaurant-detail.tsx      # 맛집 상세
│   ├── restaurant-list.tsx        # 맛집 목록 (실시간 평점)
│   ├── nearby-restaurants.tsx     # 주변 맛집 찾기
│   ├── restaurant-history.tsx     # 등록 히스토리 목록
│   ├── toilet-finder.tsx          # 화장실 찾기 (7-ELEVEN/FamilyMart)
│   ├── google-reviews.tsx         # Google 리뷰 섹션
│   ├── review-modal.tsx           # 리뷰 작성 모달
│   └── review-section.tsx         # 리뷰 목록 섹션
│
├── hooks/
│   ├── useSwipeBack.ts            # iOS 스타일 스와이프 뒤로가기
│   └── useUserLocation.ts         # 사용자 위치 관리
│
├── data/
│   └── taiwan-food.ts             # 맛집 정적 데이터 + 헬퍼 함수 + place_id 생성
│
└── lib/
    ├── mongodb.ts                 # MongoDB 연결
    ├── geo-utils.ts               # 위치/거리 계산 유틸리티
    ├── district-utils.ts          # 지역(구) 유틸리티
    │   ├── DISTRICT_INFO          # 타이베이 12개 구 + 신베이시 정보
    │   ├── extractRegion()        # 위치에서 지역명 추출
    │   ├── normalizeRegion()      # 지역명을 구 단위로 정규화
    │   ├── getRestaurantDistrict() # 맛집의 구(지역) 가져오기
    │   └── isValidDistrict()      # 유효한 구(지역)인지 확인
    ├── types.ts                   # TypeScript 타입 정의
    └── utils.ts                   # 유틸리티 (cn 함수)
```

## 데이터 흐름

### 1. 맛집 데이터

#### 1.1 정적 데이터
```
taiwan-food.ts ──► getRestaurantsByCategory() ──► 컴포넌트
                 ──► getRestaurantsByMarket()
                 ──► getRestaurantsByTour()
                 ──► searchRestaurants()
                 ──► getPopularRestaurants()
                 ──► generateStaticPlaceId()    # place_id 생성
```

- 맛집 데이터는 `taiwan-food.ts`에 정적으로 저장
- 카테고리: 면류, 밥류, 탕류, 만두, 디저트, 길거리음식, 카페, 까르푸
- 야시장: 스린, 닝샤, 라오허제, 통화, 펑자, 단수이
- 도심투어: 시먼딩, 융캉제, 중산, 신이

#### 1.2 정적 데이터 자동 마이그레이션
```
┌──────────────────────────────────────────────────────────────────┐
│                    정적 데이터 수정/삭제 요청                       │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│           place_id가 'static_'으로 시작하는지 확인                  │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ DB에 해당 맛집이   │
                    │ 있는지 확인        │
                    └────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              │ 없음 (정적 데이터)            │ 있음 (이미 마이그레이션됨)
              ▼                             ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│  자동 마이그레이션 실행       │  │  기존 DB 데이터 사용         │
│  (정적 → MongoDB)           │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘
```

**place_id 생성 규칙 (정적 데이터)**
```typescript
// 형식: static_${이름}_${카테고리}
generateStaticPlaceId("딩타이펑", "만두")
// → "static_딩타이펑_만두"

generateStaticPlaceId("융캉우육면", "면류")
// → "static_융캉우육면_면류"
```

**자동 마이그레이션 대상 필드**
- `name`, `address`, `category`, `feature`
- `coordinates`, `google_rating`, `google_reviews_count`
- `phone_number`, `building`, `night_market`

#### 1.4 정적 데이터 삭제 (Soft Delete)
```
┌──────────────────────────────────────────────────────────────────┐
│                    정적 데이터 삭제 요청                           │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│           place_id가 'static_'으로 시작하는지 확인                  │
└─────────────────────────────┬────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ 정적 데이터                     │ 일반 데이터
              ▼                               ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│  Soft Delete                │  │  Hard Delete               │
│  - deleted: true            │  │  - deleteOne() 실행         │
│  - deleted_at: timestamp    │  │                             │
│  (DB에 기록 유지)            │  │                             │
└─────────────────────────────┘  └─────────────────────────────┘
```

**목록 조회 시 필터링**
```typescript
// API 응답에 삭제된 정적 데이터 ID 목록 포함
const deletedStaticIds = await collection
  .find({ deleted: true, place_id: { $regex: /^static_/ } })
  .project({ place_id: 1 })
  .toArray();

// 클라이언트에서 정적 데이터 필터링
staticRestaurants = staticRestaurants.filter(r => {
  const staticPlaceId = r.place_id || generateStaticPlaceId(r.이름, r.category);
  return !deletedStaticIds.includes(staticPlaceId);
});
```

#### 1.3 사용자 등록 맛집 (동적)
```
┌──────────┐   GET /api/custom-restaurants  ┌──────────────────┐
│ 클라이언트│ ──────────────────────────────► │ MongoDB          │
│          │ ◄────────────────────────────── │ custom_restaurants│
└──────────┘                                 └──────────────────┘
```

- MongoDB `custom_restaurants` 컬렉션에 저장
- Google Places API로 장소 정보 자동 조회
- 정적 데이터와 병합하여 표시
- **정적 데이터 수정/삭제 시 자동으로 DB로 마이그레이션**

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
currentView: "home" | "list" | "detail" | "nearby" | "history" | "toilet" | "district-ranking" | "guide"
viewHistory: View[]  // 네비게이션 스택 (뒤로가기 추적용)

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
  "userId": 1,
  "email": "user@example.com",
  "name": "사용자명",
  "is_admin": false,
  "exp": 1234567890
}
```

### 이메일 인증 흐름 (Resend API)
```
┌─────────┐  POST /send-verification  ┌─────────┐  API 호출   ┌─────────┐
│ 클라이언트│ ───────────────────────► │   API   │ ──────────► │ Resend  │
│         │                           │         │             │  Email  │
└─────────┘                           └────┬────┘             └─────────┘
                                           │
                                           ▼
                                    ┌─────────────────┐
                                    │ MongoDB         │
                                    │ email_verifications│
                                    │ (code, expires) │
                                    └─────────────────┘
```

## UI/UX 패턴

### 바텀 시트 (Sheet) - 카테고리 선택
- Radix UI Dialog 기반
- `side="bottom"` 설정으로 하단에서 슬라이드 업
- `max-h-[70vh]`로 높이 제한
- 내부 콘텐츠 스크롤 가능

### 바텀시트 모달 (맛집수정, 리뷰)
- 커스텀 구현 (CSS 애니메이션)
- 아래에서 위로 슬라이드 애니메이션 (`slide-up`)
- 드래그 핸들 (상단 회색 바)
- 배경 터치 시 닫힘
- 상단 모서리만 둥글게 (`rounded-t-3xl`)
- 최대 높이 85~90vh, safe-area 고려

### 모달 배경 스크롤 방지
```typescript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
  return () => {
    document.body.style.overflow = "";
  };
}, [isOpen]);
```

### 네비게이션 구조
```
홈 ─┬─► 인기 맛집 ───► 상세
    ├─► 야시장별 맛집 ─► 상세
    ├─► 지역별 랭킹 ──► 지역 맛집 목록 ─► 상세
    ├─► 검색 결과 ────► 상세
    ├─► 타이베이 가이드 (독립 화면)
    └─► 화장실 찾기 ──► Google Maps 길찾기

카테고리 ─► 목록 ─► 상세
야시장 ───► 목록 ─► 상세
도심투어 ─► 목록 ─► 상세
맛집알리미 ─► 상세

사용자메뉴 ─► 등록 히스토리 ─► 상세 ─► (뒤로가기) ─► 등록 히스토리

지역별 랭킹 (더보기) ─► 전체 지역 랭킹 ─► 지역 맛집 목록 ─► 상세
                                       └─► (뒤로가기) ─► 전체 지역 랭킹
```

### 뒤로가기 로직
- `viewHistory` 스택으로 이전 화면 추적 (배열)
- 화면 이동 시 현재 화면을 스택에 push
- 뒤로가기 시 스택에서 pop하여 이전 화면으로 정확히 복귀
- 여러 단계 이동 후에도 정확한 뒤로가기 지원

```typescript
// 화면 이동 시
setViewHistory(prev => [...prev, currentView]);
setCurrentView("list");

// 뒤로가기 시
const previousView = viewHistory[viewHistory.length - 1] || "home";
setViewHistory(prev => prev.slice(0, -1));
setCurrentView(previousView);
```

### 사용자 등록 맛집 데이터 동기화
- 상세 화면 진입 시 DB에서 최신 데이터 자동 fetch
- 수정 후 `onUpdate` 콜백으로 부모 상태 실시간 반영
- `place_id` 기반으로 custom_restaurants 컬렉션 조회

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
│ Resend (Email)  │
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

---

## 주요 기능 구현 패턴

### 좌표→주소 자동 변환 (역지오코딩)

맛집 수정 모달에서 사용자가 좌표를 붙여넣으면 자동으로 주소로 변환됩니다.

```typescript
// 좌표 형식 감지 정규식
const COORDINATE_REGEX = /^\s*\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?\s*$/;

// 지원 형식
// - (25.055701, 121.519953)  // 괄호 포함
// - 25.055701, 121.519953    // 괄호 없음

// 사용 예시
const handleAddressChange = useCallback((value: string) => {
  setAddress(value);

  const match = value.match(COORDINATE_REGEX);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    // 유효한 좌표인지 확인
    if (!isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180) {
      convertCoordinatesToAddress(lat, lng);
    }
  }
}, [convertCoordinatesToAddress]);

// API 호출
const convertCoordinatesToAddress = async (lat: number, lng: number) => {
  const res = await fetch("/api/reverse-geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  const data = await res.json();
  if (data.success) {
    setAddress(data.data.address);  // Plus Code 반환
    setCoordinates({ lat, lng });
  }
};
```

### Plus Code 활용

Google Geocoding API의 `compound_code`를 기본 주소로 사용합니다.

```typescript
// Plus Code 형식
// compound_code: "3F4M+5G6 大安區 臺北市 대만"
// global_code: "7QQ23F4M+5G6"

// API 응답 처리
const plusCode = data.plus_code;
const compoundCode = plusCode?.compound_code || "";

return {
  address: compoundCode || result.formatted_address,
  plus_code: compoundCode,
  global_code: plusCode?.global_code || "",
};
```

**Plus Code 장점:**
- Google Maps에서 직접 검색 가능
- 정확한 위치 표시
- 짧고 기억하기 쉬운 형식

### 히스토리 자동 기록

맛집 정보 변경 시 자동으로 히스토리가 기록됩니다.

```typescript
// 변경된 필드 추적
const changedFields: string[] = [];
if (address) changedFields.push('주소');
if (feature !== undefined) changedFields.push('특징');
if (coordinates) changedFields.push('좌표');

// 히스토리 기록
if (changedFields.length > 0) {
  await recordHistory({
    place_id,
    name,
    address,
    category,
    registered_by: userId,
    registered_by_name: userName,
    action: 'update',
    memo: `정보 수정: ${changedFields.join(', ')}`,
  });
}
```

### 반응형 테이블/카드 레이아웃

히스토리 목록에서 화면 크기에 따라 다른 레이아웃을 표시합니다.

```typescript
// 모바일: 카드 형식
<div className="md:hidden">
  <div className="flex items-start justify-between gap-2">
    {/* 카드 내용 */}
  </div>
</div>

// 데스크탑: 테이블 형식
<div className="hidden md:block overflow-hidden">
  <div className="grid grid-cols-12 gap-2 items-center">
    {/* 테이블 행 */}
  </div>
</div>
```

**텍스트 오버플로우 방지:**
```css
/* 각 셀에 적용 */
.cell {
  overflow: hidden;
  min-width: 0;
}

/* 텍스트에 적용 */
.text {
  truncate;  /* text-overflow: ellipsis */
  whitespace-nowrap;
}
```
