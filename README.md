# 대만맛집정보

대만 여행자를 위한 맛집 정보 서비스입니다. 야시장, 도심투어 지역별 맛집과 카페 정보를 제공합니다.

## 주요 기능

### 맛집 검색 및 탐색
- 카테고리별 맛집 (샤오롱바오, 우육면, 망고빙수 등)
- 야시장별 맛집 (스린, 라오허제, 닝샤 등)
- 도심투어 지역별 맛집 (시먼딩, 용캉제, 중산 등)
- 실시간 검색 자동완성
- 인기 맛집 추천

### 주변 맛집 찾기 (맛집알리미)
- GPS 기반 현재 위치 탐지
- 반경 선택 (500m ~ 5km)
- 주소 검색으로 위치 설정
- 거리순 맛집 정렬

### 리뷰 시스템
- 별점 리뷰 작성 (음식, 서비스, 분위기)
- 사진 첨부 기능 (Cloudinary 연동)
- Google 리뷰 연동
- 리뷰 수정/삭제

### 회원 시스템
- 이메일 기반 회원가입/로그인
- JWT 토큰 인증 (7일 유효)
- 비밀번호 변경 기능

### UX 개선
- iOS 스타일 스와이프 뒤로가기
- 터치 최적화 뒤로가기 버튼 (44px 터치 영역)
- iOS Safe Area 지원 (노치/다이나믹 아일랜드)

## 기술 스택

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI, Lucide Icons
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Authentication**: JWT (jsonwebtoken)
- **Image Upload**: Cloudinary
- **Deployment**: Vercel

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/          # 로그인 API
│   │   │   ├── register/       # 회원가입 API
│   │   │   ├── logout/         # 로그아웃 API
│   │   │   ├── me/             # 사용자 정보 조회 API
│   │   │   └── change-password/ # 비밀번호 변경 API
│   │   ├── reviews/            # 리뷰 CRUD API
│   │   ├── upload/             # 이미지 업로드 API
│   │   └── place-photo/        # Google Places 사진 API
│   └── page.tsx                # 메인 페이지
├── components/
│   ├── auth-modal.tsx          # 로그인/회원가입 모달
│   ├── change-password-modal.tsx # 비밀번호 변경 모달
│   ├── restaurant-card.tsx     # 맛집 카드 컴포넌트
│   ├── restaurant-detail.tsx   # 맛집 상세 페이지
│   ├── restaurant-list.tsx     # 맛집 목록 페이지
│   ├── nearby-restaurants.tsx  # 주변 맛집 찾기 (맛집알리미)
│   ├── google-reviews.tsx      # Google 리뷰 섹션
│   ├── review-section.tsx      # 리뷰 섹션 컴포넌트
│   ├── category-sheet.tsx      # 카테고리 선택 시트
│   └── bottom-nav.tsx          # 하단 네비게이션
├── hooks/
│   ├── useSwipeBack.ts         # iOS 스타일 스와이프 뒤로가기
│   └── useUserLocation.ts      # 사용자 위치 관리
├── data/
│   └── taiwan-food.ts          # 맛집 데이터
└── lib/
    ├── mongodb.ts              # MongoDB 연결
    ├── geo-utils.ts            # 위치/거리 계산 유틸리티
    ├── types.ts                # TypeScript 타입 정의
    └── utils.ts                # 유틸리티 함수
```

## 인증 시스템

### 회원가입
- **필수 필드**: 이름, 이메일, 비밀번호
- **비밀번호 규칙**: 최소 6자 이상
- **중복 체크**: 이메일 중복 확인
- **비밀번호 저장**: bcrypt 해시 (salt rounds: 10)

### 로그인
- **인증 방식**: JWT 토큰
- **토큰 유효기간**: 7일
- **쿠키 설정**: httpOnly, secure(production), sameSite: strict

### 비밀번호 변경
- **인증 필요**: JWT 토큰 검증
- **검증 규칙**:
  - 현재 비밀번호 확인
  - 새 비밀번호 6자 이상
  - 현재 비밀번호와 다른 비밀번호

## 환경 변수

```env
# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=taiwan_food

# JWT
JWT_SECRET=your-secret-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Google Places API
GOOGLE_PLACES_API_KEY=...
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## API 엔드포인트

### 인증 API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| POST | /api/auth/logout | 로그아웃 |
| GET | /api/auth/me | 현재 사용자 정보 |
| POST | /api/auth/change-password | 비밀번호 변경 |

### 리뷰 API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reviews?restaurant_id=... | 리뷰 목록 조회 |
| POST | /api/reviews | 리뷰 작성 |
| PUT | /api/reviews/[id] | 리뷰 수정 |
| DELETE | /api/reviews/[id] | 리뷰 삭제 |

### 기타 API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | 이미지 업로드 |
| GET | /api/place-photo | Google Places 사진 조회 |

## 배포

Vercel에서 자동 배포됩니다. `main` 브랜치에 푸시하면 자동으로 운영 환경에 반영됩니다.
