# 트러블슈팅 가이드

## 1. Google 리뷰 최신 업데이트 문제

### 문제
Google Places API에서 가져온 리뷰가 최신 리뷰가 아닌 경우

### 원인 및 해결

#### 원인 1: Google Places API 기본 정렬
- Google API는 기본적으로 "관련성" 기준으로 리뷰 반환
- **해결**: `reviews_sort=newest` 파라미터 추가
```typescript
const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&language=ko&reviews_sort=newest&key=${GOOGLE_API_KEY}`;
```

#### 원인 2: 자동 업데이트 부재
- 리뷰 데이터가 캐시되어 오래된 데이터 표시
- **해결**: Vercel Cron Job으로 자동 갱신 설정

#### 원인 3: 다중 캐시 레이어
- MongoDB 캐시 (24시간)
- 클라이언트 메모리 캐시 (세션 동안)
- **해결**: 캐시 무효화 API 사용

---

## 2. Vercel Cron Job 플랜별 제한

### 플랜 비교표

| 플랜 | 비용 | Cron 개수 | 실행 주기 | 시간 정확도 |
|------|------|-----------|-----------|-------------|
| **Hobby** | 무료 | 2개 | **하루 1번만** | 불규칙 (1시간 오차 가능) |
| **Pro** | $20/월 | 40개 | **무제한** (분 단위 가능) | 정확 |
| **Enterprise** | 별도 문의 | 100개 | 무제한 | 정확 |

### 중요 사항
- Hobby 플랜에서 `0 */3 * * *` (3시간마다) 설정해도 **하루 1번만 실행**됨
- 3시간마다 자동 갱신하려면 Pro 플랜 업그레이드 필요

### Pro 플랜 업그레이드 방법
1. https://vercel.com/dashboard 접속
2. 왼쪽 상단 팀 이름 → **Settings**
3. **Billing** 탭 → **Upgrade to Pro** 클릭
4. 결제 정보 입력

직접 링크: https://vercel.com/account/billing

---

## 3. 외부 Cron 서비스 대안 (무료)

Hobby 플랜에서 더 자주 실행하려면 외부 서비스 사용 가능:

### 옵션 1: cron-job.org (무료)
1. https://cron-job.org 가입
2. Create Cronjob 클릭
3. URL: `https://your-domain.vercel.app/api/cron/refresh-reviews`
4. Schedule: 원하는 주기 설정

### 옵션 2: GitHub Actions (무료)
`.github/workflows/cron.yml` 파일 생성:
```yaml
name: Refresh Reviews
on:
  schedule:
    - cron: '0 */3 * * *'  # 3시간마다
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: curl -X GET "https://your-domain.vercel.app/api/cron/refresh-reviews"
```

---

## 4. 캐시 관리 API

### 캐시 상태 확인
```
GET /api/cache/invalidate?key=ADMIN_SECRET_KEY
```

### 캐시 무효화
```bash
# 전체 캐시 무효화
POST /api/cache/invalidate?key=ADMIN_SECRET_KEY&type=all

# 리뷰 캐시만 무효화
POST /api/cache/invalidate?key=ADMIN_SECRET_KEY&type=reviews

# 특정 식당만 무효화
POST /api/cache/invalidate?key=ADMIN_SECRET_KEY&name=딩타이펑
```

### 수동 리뷰 갱신
```
GET /api/cron/refresh-reviews
```

---

## 5. 환경 변수 설정

Vercel 대시보드 → Settings → Environment Variables

| 변수명 | 용도 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | Google Places API | O |
| `MONGODB_URI` | MongoDB 연결 | O |
| `MONGODB_DB_NAME` | 데이터베이스 이름 | O |
| `ADMIN_SECRET_KEY` | 관리자 API 인증 | O |
| `CRON_SECRET` | Cron Job 인증 | O |
| `CLOUDINARY_URL` | 이미지 저장소 | O |
