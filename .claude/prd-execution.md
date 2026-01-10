# 실행 계획 및 체크리스트

## Phase 1: 기본 구조 (완료)

### 프로젝트 설정
- [x] Next.js 15 프로젝트 생성
- [x] TypeScript 설정
- [x] Tailwind CSS 4 설정
- [x] shadcn/ui 컴포넌트 설치
- [x] ESLint 설정

### 기본 레이아웃
- [x] 루트 레이아웃 (layout.tsx)
- [x] 전역 스타일 (globals.css)
- [x] Safe Area 지원

## Phase 2: UI 컴포넌트 (완료)

### 공통 컴포넌트
- [x] Button
- [x] Card
- [x] Badge
- [x] Input
- [x] Dialog
- [x] Sheet (바텀 시트)
- [x] ScrollArea
- [x] Tabs
- [x] Skeleton
- [x] Separator
- [x] Avatar

### 비즈니스 컴포넌트
- [x] BottomNav (하단 네비게이션)
- [x] CategorySheet (카테고리 선택)
- [x] RestaurantCard (맛집 카드)
- [x] RestaurantList (맛집 목록)
- [x] RestaurantDetail (맛집 상세)

## Phase 3: 데이터 레이어 (완료)

### 정적 데이터
- [x] 맛집 데이터 구조 정의
- [x] 카테고리별 맛집 데이터
- [x] 야시장별 맛집 데이터
- [x] 도심투어 맛집 데이터
- [x] 갈만한 곳 데이터
- [x] 카페 데이터 추가
- [x] 공차/까르푸 데이터 추가

### 헬퍼 함수
- [x] getRestaurantsByCategory()
- [x] getRestaurantsByMarket()
- [x] getRestaurantsByTour()
- [x] getPlaces()
- [x] getPopularRestaurants()
- [x] searchRestaurants()

## Phase 4: 인증 시스템 (완료)

### API 엔드포인트
- [x] POST /api/auth/register
- [x] POST /api/auth/login
- [x] POST /api/auth/logout
- [x] GET /api/auth/me

### 클라이언트
- [x] AuthModal 컴포넌트
- [x] 로그인/회원가입 폼
- [x] 세션 상태 관리

## Phase 5: 리뷰 시스템 (완료)

### API 엔드포인트
- [x] GET /api/reviews
- [x] POST /api/reviews
- [x] DELETE /api/reviews/[id]

### 이미지 업로드
- [x] POST /api/upload (Cloudinary)
- [x] 클라이언트 이미지 리사이즈
- [x] CLOUDINARY_URL 파싱 지원

### 클라이언트
- [x] ReviewSection 컴포넌트
- [x] ReviewModal 컴포넌트
- [x] 별점 입력 UI
- [x] 사진 업로드 UI

## Phase 6: 검색 기능 (완료)

### 구현
- [x] 검색 입력창 UI
- [x] 실시간 자동완성
- [x] 검색 결과 표시
- [x] 검색 결과에서 상세 이동

## Phase 7: UI/UX 개선 (진행 중)

### 완료된 개선
- [x] 리뷰 모달 게시 버튼 가시성
- [x] 헤더 세로 정렬
- [x] 카테고리 모달 스크롤 (최신)

### 추가 개선 사항
- [ ] 로딩 스켈레톤 추가
- [ ] 에러 바운더리 적용
- [ ] 애니메이션 개선

## Phase 8: 테스트 및 배포 (완료)

### 배포
- [x] Vercel 연동
- [x] 환경변수 설정
- [x] 자동 배포 파이프라인

### 문서화
- [x] README.md
- [x] TROUBLESHOOTING.md
- [x] FEATURES.md
- [x] API.md
- [x] ARCHITECTURE.md
- [x] .claude 문서

## 트러블슈팅 히스토리

| 날짜 | 문제 | 해결 |
|------|------|------|
| - | 리뷰 사진 업로드 실패 | 클라이언트 이미지 리사이즈 |
| - | Cloudinary 환경변수 | CLOUDINARY_URL 파싱 |
| - | 리뷰 모달 게시 버튼 가려짐 | 모달 레이아웃 수정 |
| - | 헤더 세로 정렬 | flex items-center 적용 |
| 2024-01 | 카테고리 모달 오버플로우 | max-h-[70vh] + overflow-y-auto |

## 향후 계획

### 단기
- [ ] 리뷰 수정 기능
- [ ] 프로필 페이지
- [ ] 찜 기능

### 중기
- [ ] 지도 통합 (Kakao/Google Maps)
- [ ] 오프라인 캐싱 (Service Worker)
- [ ] 푸시 알림

### 장기
- [ ] 다국어 지원 (영어, 중국어)
- [ ] 사용자 추천 알고리즘
- [ ] 예약 기능 연동
