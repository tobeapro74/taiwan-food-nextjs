# 대만맛집정보 (Taiwan Food Guide)

대만 여행자를 위한 맛집, 야시장, 관광지 정보 앱

## 기술 스택

| 분류 | 기술 |
|------|------|
| **프레임워크** | Next.js 16.1.4 (App Router) |
| **언어** | TypeScript 5 |
| **스타일링** | Tailwind CSS 4 |
| **UI 컴포넌트** | Radix UI (Dialog, Tabs, ScrollArea 등) |
| **아이콘** | Lucide React |
| **데이터베이스** | MongoDB Atlas |
| **이미지 저장소** | Cloudinary |
| **인증** | JWT + bcryptjs |
| **이메일** | Resend API |
| **지도 API** | Google Places API |
| **AI (일정 생성)** | Claude API (Anthropic) |
| **AI (맛집 추천)** | OpenAI GPT-4o-mini |
| **배포** | Vercel (Cron Jobs 포함) |

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # 인증 API
│   │   │   ├── login/         # 로그인
│   │   │   ├── logout/        # 로그아웃
│   │   │   ├── me/            # 현재 사용자 정보
│   │   │   ├── register/      # 회원가입
│   │   │   ├── delete-account/ # 계정 삭제
│   │   │   ├── change-password/ # 비밀번호 변경
│   │   │   ├── send-verification/ # 이메일 인증 코드 발송
│   │   │   └── verify-email/  # 인증 코드 확인
│   │   ├── reviews/           # 리뷰 CRUD API
│   │   │   ├── route.ts       # GET/POST
│   │   │   └── [id]/          # PUT/DELETE
│   │   ├── custom-restaurants/ # 사용자 등록 맛집 API
│   │   │   └── route.ts       # GET/POST/PATCH/PUT/DELETE
│   │   ├── restaurant-history/ # 등록 히스토리 API
│   │   ├── seven-eleven-toilet/ # 7-ELEVEN 화장실 검색
│   │   ├── familymart-toilet/ # FamilyMart 매장 검색
│   │   ├── ai-recommend/      # AI 맛집 추천 (GPT-4o-mini + 프리셋 캐시)
│   │   ├── schedule-generate/ # AI 여행 일정 생성 (Claude API)
│   │   ├── schedules/         # 일정 저장/조회 API
│   │   ├── hotel-search/      # 호텔 검색 API
│   │   ├── home-data/         # 홈 화면 데이터 API
│   │   ├── cron/              # Cron Jobs
│   │   │   ├── refresh-reviews/ # 리뷰 정보 갱신
│   │   │   ├── sync-seven-eleven/ # 7-ELEVEN 동기화
│   │   │   └── sync-familymart/ # FamilyMart 동기화
│   │   ├── ratings/           # 실시간 평점 조회 API
│   │   ├── upload/            # 이미지 업로드 (Cloudinary)
│   │   └── place-photo/       # Google Places 이미지 프록시
│   ├── privacy/               # 개인정보 처리방침 페이지
│   ├── support/               # 고객지원 페이지
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               # 메인 페이지
├── components/
│   ├── ui/                    # 공통 UI 컴포넌트 (EmptyState 포함)
│   ├── auth-modal.tsx         # 로그인/회원가입 모달
│   ├── bottom-nav.tsx         # 하단 네비게이션 (pill indicator)
│   ├── category-sheet.tsx     # 카테고리 선택 시트
│   ├── category-edit-modal.tsx # 카테고리 수정 모달
│   ├── restaurant-card.tsx    # 맛집 카드 (롱프레스 미리보기)
│   ├── restaurant-detail.tsx  # 맛집 상세 페이지
│   ├── restaurant-list.tsx    # 맛집 목록
│   ├── restaurant-history.tsx # 등록 히스토리 목록
│   ├── add-restaurant-modal.tsx # 맛집 등록 모달
│   ├── nearby-restaurants.tsx # 주변 맛집 찾기
│   ├── toilet-finder.tsx      # 화장실 찾기 (7-ELEVEN/FamilyMart)
│   ├── google-reviews.tsx     # Google 리뷰 섹션
│   ├── review-modal.tsx       # 리뷰 작성 모달
│   ├── review-section.tsx     # 리뷰 목록 섹션
│   ├── theme-provider.tsx     # 다크모드 테마 프로바이더
│   ├── onboarding.tsx         # 온보딩 캐러셀 (스와이프)
│   ├── ai-recommend.tsx       # AI 맛집 추천
│   └── peek-preview.tsx       # 롱프레스 미리보기
├── hooks/
│   ├── useSwipeBack.ts        # iOS 스타일 스와이프 뒤로가기
│   ├── useUserLocation.ts     # 사용자 위치 관리
│   ├── useHaptic.ts           # 햅틱 피드백
│   ├── useLongPress.ts        # 롱프레스 제스처
│   └── usePullToRefresh.ts    # Pull-to-Refresh
├── data/
│   └── taiwan-food.ts         # 맛집 정적 데이터
└── lib/
    ├── mongodb.ts             # MongoDB 연결
    ├── geo-utils.ts           # 위치/거리 계산 유틸리티
    ├── cache.ts               # 서버 사이드 LRU 캐시 (평점, 리뷰, 이미지, 맛집)
    ├── types.ts               # TypeScript 타입 정의
    └── utils.ts               # 유틸리티 함수
```

## 환경변수

```env
# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=taiwan_food

# Cloudinary (방법 1 - 권장)
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# Cloudinary (방법 2 - 개별 변수)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret

# Google Places API
GOOGLE_PLACES_API_KEY=your_google_api_key

# Resend (이메일 발송)
RESEND_API_KEY=re_xxxx

# Cron Secret (Vercel)
CRON_SECRET=your_cron_secret

# Admin Secret Key (관리자 등록용)
ADMIN_SECRET_KEY=your_admin_secret

# Claude API (AI 일정 생성)
ANTHROPIC_API_KEY=your_anthropic_api_key

# OpenAI API (AI 맛집 추천)
OPENAI_API_KEY=your_openai_api_key
```

## 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 배포

Vercel에 연결된 GitHub 저장소에 push하면 자동 배포됩니다.

```bash
git add .
git commit -m "feat: 기능 설명"
git push
```

### Vercel Cron Jobs

| 스케줄 | 경로 | 설명 |
|--------|------|------|
| 매일 06:00 UTC | /api/cron/refresh-reviews | Google 리뷰 정보 갱신 |
| 매일 22:00 UTC | /api/cron/sync-seven-eleven | 7-ELEVEN 매장 동기화 |
| 매일 23:00 UTC | /api/cron/sync-familymart | FamilyMart 매장 동기화 |

## 관련 문서

- [기능 명세서](./FEATURES.md) - 전체 기능 목록
- [아키텍처 문서](./ARCHITECTURE.md) - 시스템 구조 및 데이터 흐름
- [API 명세서](./API.md) - REST API 엔드포인트
- [트러블슈팅 가이드](./TROUBLESHOOTING.md) - 문제 해결 가이드

## 주요 기능

### 맛집 기능
- 카테고리/야시장/도심투어별 맛집 검색
- 주변 맛집 찾기 (GPS/주소 기반)
- Google 리뷰 연동 및 실시간 평점 조회
- 사용자 리뷰 작성 (사진 첨부)
- **사용자 맛집 등록** (Google Places 연동)
  - 카테고리 선택 및 수정
  - 중복 등록 방지 (place_id 기반)
- **맛집 등록 히스토리** (등록/수정/삭제 내역)

### 화장실 찾기
- **7-ELEVEN 화장실** (화장실 개방 매장만 표시)
- **FamilyMart 화장실**
- 현재 위치 기준 2km 이내 검색
- 거리순 정렬, Google Maps 길찾기 연동
- 타이베이시 + 신베이시 41개 구 지원

### 회원 기능
- **이메일 인증 회원가입** (Resend API)
- 비밀번호 변경
- **계정 삭제 기능**
- iOS 스타일 스와이프 뒤로가기
- PWA 지원 (홈 화면 추가)
- **App Store 아이콘 적용** (PWA 바로가기 아이콘)

### AI 기능
- **AI 여행 일정 생성** (Claude API 기반)
  - 여행 일수, 인원, 취향 선택
  - 일정 저장 및 관리
- **AI 맛집 추천** (GPT-4o-mini 기반)
  - 8개 프리셋 칩 + 자유 텍스트 입력
  - 프리셋 결과 MongoDB 캐시 (즉시 반환)
  - 자유 입력 시 AI 검색 중 풀스크린 스핀 모달
  - 시간대 컨텍스트 자동 반영
  - Hallucination 방지 (실제 DB 매칭)

### UI/UX 고급 기능
- **다크모드** (라이트/다크/시스템)
- **시간대별 맛집 추천** (대만 시간 기준 5개 슬롯)
- **온보딩 캐러셀** (첫 방문 시 4스텝, 스와이프 지원)
- **카드 롱프레스 미리보기** (Peek Preview)
- **햅틱 피드백** (Web API + iOS 네이티브 브리지)
- **Pull-to-Refresh** (홈 화면 당겨서 새로고침)
- **Bento Grid** 퀵 액세스 (가이드, 화장실, AI추천)
- **TDS 3색 체계** (Primary + Accent + Destructive)
- **Shimmer 로딩** 스켈레톤
- **Glass Morphism** 시트 디자인

### 정책 페이지
- **개인정보 처리방침** (/privacy)
- **고객지원** (/support)
