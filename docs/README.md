# 대만맛집정보 (Taiwan Food Guide)

대만 여행자를 위한 맛집, 야시장, 관광지 정보 앱

## 기술 스택

| 분류 | 기술 |
|------|------|
| **프레임워크** | Next.js 16.1.1 (App Router) |
| **언어** | TypeScript 5 |
| **스타일링** | Tailwind CSS 4 |
| **UI 컴포넌트** | Radix UI (Dialog, Tabs, ScrollArea 등) |
| **아이콘** | Lucide React |
| **데이터베이스** | MongoDB Atlas |
| **이미지 저장소** | Cloudinary |
| **인증** | JWT + bcryptjs |
| **배포** | Vercel |

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # 인증 API
│   │   │   ├── login/      # 로그인
│   │   │   ├── logout/     # 로그아웃
│   │   │   ├── me/         # 현재 사용자 정보
│   │   │   └── register/   # 회원가입
│   │   ├── reviews/        # 리뷰 CRUD API
│   │   │   ├── route.ts    # GET/POST
│   │   │   └── [id]/       # PUT/DELETE
│   │   ├── upload/         # 이미지 업로드 (Cloudinary)
│   │   └── place-photo/    # Google Places 이미지 프록시
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # 메인 페이지
├── components/
│   ├── ui/                 # 공통 UI 컴포넌트
│   ├── auth-modal.tsx      # 로그인/회원가입 모달
│   ├── bottom-nav.tsx      # 하단 네비게이션
│   ├── category-sheet.tsx  # 카테고리 선택 시트
│   ├── restaurant-card.tsx # 맛집 카드
│   ├── restaurant-detail.tsx # 맛집 상세 페이지
│   ├── restaurant-list.tsx # 맛집 목록
│   ├── nearby-restaurants.tsx # 주변 맛집 찾기
│   ├── google-reviews.tsx  # Google 리뷰 섹션
│   ├── review-modal.tsx    # 리뷰 작성 모달
│   └── review-section.tsx  # 리뷰 목록 섹션
├── hooks/
│   ├── useSwipeBack.ts     # iOS 스타일 스와이프 뒤로가기
│   └── useUserLocation.ts  # 사용자 위치 관리
├── data/
│   └── taiwan-food.ts      # 맛집 정적 데이터
└── lib/
    ├── db.ts               # MongoDB 연결
    ├── geo-utils.ts        # 위치/거리 계산 유틸리티
    └── utils.ts            # 유틸리티 함수
```

## 환경변수

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Cloudinary (방법 1 - 권장)
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# Cloudinary (방법 2 - 개별 변수)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret

# Google Places API (선택)
GOOGLE_PLACES_API_KEY=your_google_api_key
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

## 관련 문서

- [기능 명세서](./FEATURES.md) - 전체 기능 목록
- [아키텍처 문서](./ARCHITECTURE.md) - 시스템 구조 및 데이터 흐름
- [API 명세서](./API.md) - REST API 엔드포인트
- [트러블슈팅 가이드](./TROUBLESHOOTING.md) - 문제 해결 가이드

## 주요 기능

- 카테고리/야시장/도심투어별 맛집 검색
- 주변 맛집 찾기 (GPS/주소 기반)
- Google 리뷰 연동
- 사용자 리뷰 작성 (사진 첨부)
- iOS 스타일 스와이프 뒤로가기
- PWA 지원 (홈 화면 추가)
