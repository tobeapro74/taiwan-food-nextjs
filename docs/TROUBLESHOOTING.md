# 트러블슈팅 가이드

## 1. 리뷰 사진 업로드 실패 문제

### 문제 상황
리뷰 작성 시 사진 업로드가 실패하는 현상이 발생했습니다.

### 원인 분석

#### 1.1 Vercel 요청 크기 제한
- **문제**: Vercel Serverless Functions는 요청 본문(body) 크기가 **4.5MB**로 제한됨
- **증상**: 고해상도 이미지(예: 4000x3000px)를 Base64로 인코딩하면 원본 크기의 약 1.37배가 됨
- **결과**: 큰 이미지 업로드 시 `413 Payload Too Large` 또는 요청 타임아웃 발생

#### 1.2 Cloudinary 환경변수 설정 문제
- **문제**: Vercel에서 `CLOUDINARY_URL` 환경변수 형식을 자동으로 파싱하지 못함
- **증상**: "Cloudinary 설정이 누락되었습니다" 에러 발생
- **원인**: `cloudinary://api_key:api_secret@cloud_name` 형식의 URL을 수동으로 파싱해야 함

#### 1.3 메모리 효율성 문제
- **문제**: `FileReader.readAsDataURL()`로 큰 파일을 읽으면 브라우저 메모리 과다 사용
- **증상**: 모바일에서 앱이 느려지거나 크래시 발생

### 해결 방안

#### 해결책 1: 클라이언트 사이드 이미지 리사이즈
```typescript
// review-modal.tsx
const MAX_IMAGE_SIZE = 800; // 최대 800px
const IMAGE_QUALITY = 0.6; // JPEG 품질 60%

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // URL.createObjectURL 사용 (메모리 효율적)
    const objectUrl = URL.createObjectURL(file);
    const img = document.createElement("img");

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      // 비율 유지하면서 리사이즈
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        if (width > height) {
          height = Math.round((height / width) * MAX_IMAGE_SIZE);
          width = MAX_IMAGE_SIZE;
        } else {
          width = Math.round((width / height) * MAX_IMAGE_SIZE);
          height = MAX_IMAGE_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // JPEG로 변환 (품질 60%)
      const resizedBase64 = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);

      // 메모리 정리
      URL.revokeObjectURL(objectUrl);
      resolve(resizedBase64);
    };

    img.src = objectUrl;
  });
};
```

**핵심 포인트**:
- `URL.createObjectURL()` 사용으로 메모리 효율성 개선 (vs `FileReader`)
- 800px로 리사이즈하여 Vercel 요청 크기 제한 내에서 작동
- JPEG 품질 60%로 설정하여 파일 크기 추가 감소
- 사용 후 `URL.revokeObjectURL()`로 메모리 해제

#### 해결책 2: CLOUDINARY_URL 명시적 파싱
```typescript
// api/upload/route.ts
if (process.env.CLOUDINARY_URL) {
  // cloudinary://api_key:api_secret@cloud_name 형식 파싱
  const url = process.env.CLOUDINARY_URL;
  const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
  if (match) {
    cloudinary.config({
      cloud_name: match[3],
      api_key: match[1],
      api_secret: match[2],
    });
  }
} else {
  // 개별 환경변수 사용 (폴백)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}
```

**핵심 포인트**:
- Vercel에서 `CLOUDINARY_URL` 환경변수를 정규식으로 직접 파싱
- 개별 환경변수(`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)도 폴백으로 지원

#### 해결책 3: 상세한 에러 메시지
```typescript
// api/upload/route.ts
catch (error: unknown) {
  let errorMessage = '알 수 없는 오류';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const errObj = error as { message?: string; http_code?: number };
    errorMessage = errObj.message || JSON.stringify(error);
  }

  return NextResponse.json(
    { success: false, error: `이미지 업로드 실패: ${errorMessage}` },
    { status: 500 }
  );
}
```

### 최종 결과
- 이미지 최대 크기: 800px (가로 또는 세로 중 긴 쪽 기준)
- JPEG 품질: 60%
- 예상 파일 크기: 약 50KB~150KB (원본 이미지에 따라 다름)
- 업로드 성공률: 100% (Vercel 요청 제한 내에서 안정적으로 작동)

---

## 2. 리뷰 모달 게시 버튼 가시성 문제

### 문제 상황
모바일에서 리뷰 모달의 "게시" 버튼이 화면 밖으로 밀려 보이지 않는 현상 발생

### 원인 분석
- 모달이 하단에서 올라오는 시트(Sheet) 형태였으나, 콘텐츠가 많아지면 게시 버튼이 가려짐
- 특히 키보드가 올라온 상태에서 버튼이 화면 밖으로 밀림

### 해결 방안
```tsx
// 모달을 화면 중앙 배치로 변경
<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
  <div className="bg-background w-full max-w-lg rounded-2xl max-h-[80vh] flex flex-col">
    {/* 헤더 - 고정 */}
    <div className="flex-shrink-0 border-b px-4 py-3">
      ...
    </div>

    {/* 스크롤 가능한 컨텐츠 영역 */}
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      ...
    </div>

    {/* 게시 버튼 - 고정 */}
    <div className="flex-shrink-0 border-t p-4 bg-background rounded-b-2xl">
      <Button className="w-full py-5 text-lg">게시</Button>
    </div>
  </div>
</div>
```

**핵심 포인트**:
- `max-h-[80vh]`로 모달 최대 높이 제한
- `flex flex-col` 레이아웃으로 헤더/콘텐츠/버튼 영역 분리
- `flex-shrink-0`으로 헤더와 버튼 영역 고정
- `flex-1 overflow-y-auto`로 콘텐츠 영역만 스크롤

---

## 3. 헤더 세로 정렬 문제

### 문제 상황
헤더 내 텍스트가 위로 치우쳐져 있는 현상

### 원인 분석
- `safe-area-top` 클래스가 상단 패딩만 추가하고, 콘텐츠 세로 정렬이 적용되지 않음

### 해결 방안
```tsx
<header className="bg-gradient-to-r from-primary to-primary/80 safe-area-top">
  <div className="px-4 py-3 flex items-center justify-between">
    <div className="w-10" /> {/* 왼쪽 여백 */}
    <h1 className="text-xl font-bold text-primary-foreground text-center">
      🍜 대만맛집정보
    </h1>
    {/* 우측 버튼 */}
  </div>
</header>
```

**핵심 포인트**:
- `safe-area-top`은 header 태그에만 적용
- 내부 div에 `flex items-center justify-between`으로 세로 중앙 정렬
- 좌우 요소 균형을 위한 빈 div 사용

---

## 4. 환경변수 관련 문제

### Vercel 환경변수 설정
```env
# Cloudinary 설정 (둘 중 하나 선택)
# 방법 1: CLOUDINARY_URL (권장)
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# 방법 2: 개별 변수
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT 시크릿
JWT_SECRET=your_jwt_secret
```

### 주의사항
- Vercel에서 환경변수 설정 후 반드시 **재배포** 필요
- `CLOUDINARY_URL`과 개별 변수 중 하나만 설정해도 됨 (둘 다 설정 가능)
- Production, Preview, Development 환경별로 다르게 설정 가능

---

## 5. 카테고리 모달 스크롤 오버플로우 문제

### 문제 상황
네비게이션 > 카테고리 클릭 시 나타나는 바텀 시트 모달에서 옵션이 많을 때(11개) 모달 영역을 초과하여 화면 밖으로 넘침

### 원인 분석
- `SheetContent` 컴포넌트의 `side="bottom"` 설정에 `h-auto`만 있어 높이 제한이 없음
- 옵션이 많아지면 콘텐츠가 무한정 늘어나 화면을 벗어남
- flexbox 자식 요소의 스크롤이 작동하지 않음

### 해결 방안

#### 1단계: SheetContent에 최대 높이 제한
```tsx
// src/components/ui/sheet.tsx
side === "bottom" &&
  "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 max-h-[70vh] border-t",
```

**변경 사항**: `h-auto` → `max-h-[70vh]`
- 모달 최대 높이를 화면의 70%로 제한

#### 2단계: 옵션 리스트에 스크롤 추가
```tsx
// src/components/category-sheet.tsx
<div className="grid gap-2 py-4 overflow-y-auto flex-1 min-h-0 px-4">
  {options.map((option) => (
    // ...버튼들
  ))}
</div>
```

**핵심 CSS 클래스**:
- `overflow-y-auto`: 내용이 넘치면 세로 스크롤
- `flex-1`: 남은 공간을 채움
- `min-h-0`: flexbox 스크롤 버그 수정 (중요!)

### 왜 min-h-0이 필요한가?
Flexbox 자식 요소는 기본적으로 `min-height: auto`가 적용됨. 이로 인해 내용이 넘쳐도 축소되지 않고 부모를 벗어남. `min-h-0`을 명시하면 자식이 부모 높이에 맞게 축소되어 `overflow-y: auto`가 정상 작동함.

### 최종 결과
- 카테고리 11개(전체, 면류, 밥류, 만두, 우육탕, 훠궈, 디저트, 길거리, 카페, 공차, 까르푸) 모두 표시
- 모달 내에서 스크롤하여 모든 옵션 선택 가능
- 화면의 70% 이상 차지하지 않음

---

## 6. iOS Safe Area 헤더 겹침 문제

### 문제 상황
아이폰에서 서브페이지(상세, 목록, 맛집알리미) 헤더가 시간 표시/노치/다이나믹 아일랜드와 겹치는 현상

### 원인 분석
- 서브페이지 헤더에 `safe-area-top` 클래스가 적용되지 않음
- iOS는 상단에 시스템 UI 영역이 있어 콘텐츠가 가려짐

### 해결 방안
```tsx
// 모든 서브페이지 헤더에 safe-area-top 클래스 추가
<div className="sticky top-0 z-10 bg-background border-b shadow-sm safe-area-top">
  <div className="flex items-center gap-2 p-3">
    {/* 뒤로가기 버튼 및 제목 */}
  </div>
</div>
```

```css
/* globals.css */
.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);
}
```

**적용 파일**:
- `restaurant-detail.tsx`
- `restaurant-list.tsx`
- `nearby-restaurants.tsx`

---

## 7. 뒤로가기 버튼 터치 영역 문제

### 문제 상황
모바일에서 뒤로가기 버튼 클릭이 잘 안 되는 현상

### 원인 분석
- 버튼 크기가 터치에 최적화되지 않음 (기본 40x40px)
- Apple Human Interface Guidelines 권장 최소 터치 영역: 44x44px

### 해결 방안
```tsx
<Button
  variant="ghost"
  onClick={onBack}
  className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-black/10 hover:bg-black/20"
>
  <ArrowLeft className="h-5 w-5" />
</Button>
```

**핵심 포인트**:
- `min-w-[44px] min-h-[44px]`: 최소 터치 영역 보장
- `bg-black/10`: 반투명 배경으로 이미지 위에서도 가시성 확보
- `rounded-full`: 원형 버튼으로 터치 영역 명확화

---

## 8. 스와이프 뒤로가기 구현

### 구현 목표
iOS Safari의 스와이프 뒤로가기처럼 페이지 전체가 슬라이드되는 효과

### 구현 방법
```typescript
// hooks/useSwipeBack.ts

// 1. 터치 시작 감지 (화면 왼쪽 30px 영역)
if (touch.clientX <= edgeWidth) {
  isSwiping.current = true;
}

// 2. 터치 이동 시 페이지 슬라이드
const translateX = Math.min(progress, screenWidth);
pageContent.style.transform = `translateX(${translateX}px)`;

// 3. 터치 종료 시 판정
if (deltaX > threshold) {
  // 뒤로가기 실행 + 페이지 밀어내기 애니메이션
  animatePageOut(screenWidth, onSwipeBack);
} else {
  // 원위치 복귀
  slidePageContent(0, false, screenWidth);
}
```

**시각 효과**:
- 페이지 왼쪽에 그림자 효과
- 배경 오버레이 (스와이프할수록 밝아짐)
- 부드러운 ease-out 애니메이션

---

## 9. 동일 이름 맛집의 잘못된 리뷰 표시 문제

### 1. 발생 현상

**증상**: "Dark Palace Taiwanese Gourmet" 맛집을 등록했는데, 다른 지점의 리뷰가 표시됨

| 구분 | 올바른 장소 | 잘못 표시된 장소 |
|------|-------------|------------------|
| 주소 | No. 11-10號, Zhongzheng Rd | No. 8號, Lane 62, Section 1, Zhongzheng Rd |
| 리뷰 수 | 15,543개 | 28,987개 |
| place_id | `ChIJFSbFVlilQjQRdX_8QpjPxc0` | `ChIJp8_h80ilQjQRPPqVtqEu46w` |

**발생 원인 분석**:
1. 맛집 등록 시 사용자가 선택한 장소의 `place_id`가 `custom_restaurants` 테이블에 올바르게 저장됨
2. 하지만 리뷰 조회 API(`/api/google-reviews/[name]`)가 **맛집 이름으로 Google에서 다시 검색**
3. Google 검색 결과 중 **첫 번째 결과**를 무조건 사용 (리뷰 수가 많은 다른 지점이 먼저 나옴)
4. 잘못된 `place_id`로 리뷰를 가져와 캐시에 저장

```
등록 시: "Dark Palace" 선택 → place_id A 저장 (올바름)
리뷰 조회 시: "Dark Palace" 검색 → place_id B 반환 (잘못됨) → 캐시 저장
```

---

### 2. 시도한 조치 방법들

#### 시도 1: MongoDB에서 직접 데이터 확인
```bash
# custom_restaurants 테이블 확인
python3 << 'EOF'
from pymongo import MongoClient
client = MongoClient("mongodb+srv://...")
db = client["taiwan_food"]
collection = db["custom_restaurants"]
restaurant = collection.find_one({"name": {"$regex": "Dark Palace", "$options": "i"}})
print(restaurant)  # place_id가 올바른지 확인
EOF
```
**결과**: `custom_restaurants`에는 올바른 `place_id`가 저장되어 있음을 확인

#### 시도 2: 리뷰 캐시 테이블 확인
```bash
# google_reviews_cache 테이블 확인
cache = db["google_reviews_cache"]
result = cache.find_one({"restaurantName": {"$regex": "Dark", "$options": "i"}})
print(result.get("placeId"))  # 잘못된 place_id 발견!
```
**결과**: 캐시에 잘못된 `place_id`의 리뷰가 저장되어 있음

#### 시도 3: 기존 리뷰 조회 로직 분석
```typescript
// 문제의 코드 (src/app/api/google-reviews/[name]/route.ts)
const searchQuery = `${restaurantName} Taipei Taiwan`;
const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?...`;
const placeId = searchData.candidates[0].place_id;  // ❌ 첫 번째 결과 무조건 사용
```
**결과**: 등록된 맛집의 `place_id`를 사용하지 않고, 이름으로 다시 검색하는 것이 근본 원인

---

### 3. 최종 조치 방법

#### 3.1 잘못된 리뷰 캐시 삭제
```bash
python3 << 'EOF'
from pymongo import MongoClient
client = MongoClient("mongodb+srv://...")
db = client["taiwan_food"]
cache = db["google_reviews_cache"]

# 잘못된 캐시 삭제
wrong_place_id = "ChIJp8_h80ilQjQRPPqVtqEu46w"
result = cache.delete_one({"placeId": wrong_place_id})
print(f"삭제된 캐시: {result.deleted_count}개")
EOF
```

#### 3.2 리뷰 조회 API 수정 (`src/app/api/google-reviews/[name]/route.ts`)

**핵심 변경**: 등록된 맛집의 `place_id`를 우선 사용하도록 수정

```typescript
// 등록된 맛집에서 place_id 조회하는 함수 추가
async function getRegisteredPlaceId(restaurantName: string): Promise<string | null> {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("custom_restaurants");
    const restaurant = await collection.findOne({ name: restaurantName });
    return restaurant?.place_id || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, { params }) {
  const restaurantName = decodeURIComponent((await params).name);

  // URL 쿼리에서 place_id 확인 (프론트엔드에서 전달)
  const urlPlaceId = request.nextUrl.searchParams.get("placeId");

  // 1. 등록된 맛집에서 place_id 조회 (가장 신뢰할 수 있는 소스)
  const registeredPlaceId = await getRegisteredPlaceId(restaurantName);

  // place_id 결정 우선순위: URL 파라미터 > 등록된 맛집 > Google 검색
  let placeId = urlPlaceId || registeredPlaceId;

  // 2. 캐시 확인 (placeId로 먼저 검색)
  const cached = await getCachedReviews(restaurantName, placeId || undefined);
  if (cached) {
    return NextResponse.json({ reviews: cached.reviews, ... });
  }

  // 3. place_id가 없으면 Google에서 검색 (fallback)
  if (!placeId) {
    const searchQuery = `${restaurantName} Taiwan`;
    // ... Google 검색 로직 (기존 코드)
    placeId = searchData.candidates[0].place_id;
  }

  // 4. Place Details에서 리뷰 가져오기
  const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&...`;
  // ... 리뷰 조회 및 캐시 저장
}
```

#### 3.3 캐시 조회 함수 수정

```typescript
// placeId를 우선으로 캐시 검색
async function getCachedReviews(restaurantName: string, placeId?: string): Promise<ReviewCache | null> {
  const db = await connectToDatabase();
  const collection = db.collection<ReviewCache>("google_reviews_cache");

  // placeId가 있으면 placeId로 먼저 검색
  let cached = placeId ? await collection.findOne({ placeId }) : null;

  // placeId로 못 찾으면 restaurantName으로 검색 (하위 호환)
  if (!cached) {
    cached = await collection.findOne({ restaurantName });
  }

  // 24시간 캐시 만료 체크
  if (cached) {
    const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
    if (cacheAge > 24 * 60 * 60 * 1000) return null;
  }

  return cached;
}
```

---

### 4. 향후 대처 방안

#### 4.1 place_id 일관성 유지
- **원칙**: 맛집 등록 시 저장된 `place_id`를 모든 API에서 일관되게 사용
- **적용**: 리뷰 조회, 평점 조회, 가격 정보 등 모든 Google API 호출에 동일 `place_id` 사용

```
[올바른 흐름]
맛집 등록 → place_id 저장 → 리뷰 조회 시 저장된 place_id 사용
                         → 평점 조회 시 저장된 place_id 사용
                         → 가격 조회 시 저장된 place_id 사용
```

#### 4.2 관리자용 장소 수정 API 추가
잘못된 장소가 등록된 경우를 대비한 수정 API 추가 완료:

```typescript
// PUT /api/custom-restaurants
// 관리자만 사용 가능
{
  "old_place_id": "잘못된_place_id",
  "new_place_id": "올바른_place_id",
  "address": "새 주소",
  "coordinates": { "lat": 25.169, "lng": 121.443 },
  "google_reviews_count": 15543
}
```

#### 4.3 Text Search API 추가 (관리자용)
동일 이름의 맛집을 구분하기 위해 리뷰 수를 포함한 검색 API 추가:

```
GET /api/google-place-details?q=Dark Palace&mode=textsearch

Response:
{
  "results": [
    { "name": "Dark Palace", "address": "No. 8號...", "reviews_count": 28987 },
    { "name": "Dark Palace", "address": "No. 11-10號...", "reviews_count": 15543 }  // ← 이게 맞는 곳
  ]
}
```

#### 4.4 캐시 무효화 전략
- 캐시의 `placeId`가 등록된 맛집의 `place_id`와 다르면 캐시 무효화
- 24시간 캐시 만료 시 올바른 `place_id`로 새로 조회

#### 4.5 프론트엔드에서 place_id 전달 (선택적)
```typescript
// 맛집 상세 페이지에서 리뷰 조회 시
const response = await fetch(
  `/api/google-reviews/${encodeURIComponent(restaurant.name)}?placeId=${restaurant.place_id}`
);
```

---

### 관련 파일
- `src/app/api/google-reviews/[name]/route.ts` - 리뷰 조회 API (수정됨)
- `src/app/api/custom-restaurants/route.ts` - PUT 메서드 추가됨
- `src/app/api/google-place-details/route.ts` - textsearch 모드 추가됨

### 교훈
> **동일 이름의 장소가 여러 개 있을 수 있으므로, 이름 기반 검색이 아닌 고유 식별자(place_id)를 사용해야 한다.**

---

## 10. 히스토리 테이블 텍스트 겹침 문제

### 문제 상황
맛집 등록 히스토리 페이지에서 테이블 칼럼별로 텍스트가 겹쳐서 표시되는 현상 발생. 특히 '맛집명' 및 '지역' 칼럼에서 심하게 발생.

### 원인 분석
1. CSS Grid 레이아웃에서 `overflow-hidden`이 적용되지 않음
2. 긴 텍스트가 셀 영역을 벗어나 다음 칼럼과 겹침
3. 모바일과 데스크탑에서 동일한 레이아웃 사용으로 가독성 저하

### 해결 방안

#### 1단계: 모바일/데스크탑 레이아웃 분리
```tsx
// src/components/restaurant-history.tsx

{/* 모바일 레이아웃 (카드 형식) */}
<div className="md:hidden">
  <div className="flex items-start justify-between gap-2">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted-foreground">#{item.seq}</span>
        {getActionBadge(item.action)}
        <Badge variant="outline" className="text-xs">{item.category}</Badge>
      </div>
      <button className="text-sm font-medium text-primary hover:underline">
        <span className="truncate">{item.name}</span>
      </button>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">
        {item.short_address}
      </p>
    </div>
    <span className="text-xs text-muted-foreground whitespace-nowrap">
      {formatDate(item.registered_at)}
    </span>
  </div>
</div>

{/* 데스크탑 레이아웃 (테이블 형식) */}
<div className="hidden md:block overflow-hidden">
  <div className="grid grid-cols-12 gap-2 items-center">
    <div className="col-span-1 text-center overflow-hidden">
      {item.seq}
    </div>
    <div className="col-span-2 overflow-hidden whitespace-nowrap">
      {formatDate(item.registered_at)}
    </div>
    <div className="col-span-3 min-w-0 overflow-hidden">
      <span className="truncate">{item.name}</span>
    </div>
    <div className="col-span-3 truncate overflow-hidden">
      {item.short_address}
    </div>
    <div className="col-span-2 overflow-hidden">
      <Badge variant="outline" className="text-xs truncate max-w-full">
        {item.category}
      </Badge>
    </div>
    <div className="col-span-1 flex justify-center overflow-hidden">
      {getActionBadge(item.action)}
    </div>
  </div>
</div>
```

#### 2단계: 테이블 헤더에도 동일하게 적용
```tsx
{/* 테이블 헤더 - 데스크탑에서만 표시 */}
<div className="sticky top-[60px] z-10 bg-muted/50 border-b hidden md:block overflow-hidden">
  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium">
    <div className="col-span-1 text-center overflow-hidden">#</div>
    <div className="col-span-2 overflow-hidden">날짜</div>
    <div className="col-span-3 overflow-hidden">맛집명</div>
    <div className="col-span-3 overflow-hidden">지역</div>
    <div className="col-span-2 overflow-hidden">카테고리</div>
    <div className="col-span-1 text-center overflow-hidden">상태</div>
  </div>
</div>
```

### 핵심 CSS 클래스

| 클래스 | 용도 |
|--------|------|
| `overflow-hidden` | 셀 영역 밖으로 텍스트 넘침 방지 |
| `min-w-0` | flexbox에서 자식 요소 축소 허용 |
| `truncate` | 텍스트 말줄임표(`...`) 처리 |
| `whitespace-nowrap` | 텍스트 줄바꿈 방지 |
| `md:hidden` / `hidden md:block` | 반응형 레이아웃 전환 |

### 반응형 레이아웃 패턴

```
┌─────────────────────────────────────┐
│         모바일 (카드 형식)           │
│  ┌─────────────────────────────┐   │
│  │ #1 [등록] [면류]    2024.01.15│   │
│  │ Dark Palace                  │   │
│  │ Zhongzheng District         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                  데스크탑 (테이블 형식)                      │
│ # │   날짜     │   맛집명      │    지역      │카테고리│상태│
│ 1 │ 2024.01.15│ Dark Palace  │ Zhongzheng...│ 면류  │등록│
└────────────────────────────────────────────────────────────┘
```

### 결과
- 모바일: 카드 형식으로 깔끔하게 정보 표시
- 데스크탑: 테이블 형식으로 한눈에 여러 항목 비교 가능
- 모든 화면 크기에서 텍스트 겹침 없이 정상 표시

---

## 11. 좌표 붙여넣기 시 주소 자동 변환 구현

### 구현 목표
맛집 수정 모달에서 구글맵에서 복사한 좌표를 붙여넣으면 자동으로 주소로 변환

### 구현 방법

#### 1단계: 좌표 형식 감지 정규식
```typescript
// 지원하는 좌표 형식
// - (25.055701, 121.519953)  // 괄호 포함
// - 25.055701, 121.519953    // 괄호 없음

const COORDINATE_REGEX = /^\s*\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?\s*$/;
```

#### 2단계: 주소 입력 필드 onChange 핸들러
```typescript
// src/components/restaurant-edit-modal.tsx

const handleAddressChange = useCallback((value: string) => {
  setAddress(value);

  // 좌표 형식인지 확인
  const match = value.match(COORDINATE_REGEX);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    // 유효한 좌표인지 확인
    if (!isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180) {
      // 역지오코딩 API 호출
      convertCoordinatesToAddress(lat, lng);
    }
  }
}, [convertCoordinatesToAddress]);
```

#### 3단계: 역지오코딩 API 호출
```typescript
const convertCoordinatesToAddress = useCallback(async (lat: number, lng: number) => {
  setIsConverting(true);
  try {
    const res = await fetch("/api/reverse-geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng }),
    });
    const data = await res.json();

    if (data.success) {
      // Plus Code 형식의 주소로 설정
      setAddress(data.data.address);  // 예: "3F4M+5G6 大安區 臺北市 대만"
      setCoordinates({ lat, lng });
    }
  } catch (error) {
    console.error("좌표 변환 실패:", error);
  } finally {
    setIsConverting(false);
  }
}, []);
```

#### 4단계: 역지오코딩 API 구현
```typescript
// src/app/api/reverse-geocode/route.ts

export async function POST(request: NextRequest) {
  const { lat, lng } = await request.json();

  // 유효성 검사
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { success: false, error: "유효하지 않은 좌표입니다." },
      { status: 400 }
    );
  }

  // Google Geocoding API 호출
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&language=ko`;
  const response = await fetch(url);
  const data = await response.json();

  // Plus Code 추출 (compound_code가 더 상세한 주소 역할)
  const plusCode = data.plus_code;
  const compoundCode = plusCode?.compound_code || "";

  return NextResponse.json({
    success: true,
    data: {
      address: compoundCode || result.formatted_address,
      plus_code: compoundCode,
      global_code: plusCode?.global_code || "",
      coordinates: { lat, lng },
      place_id: result.place_id,
    },
  });
}
```

### Plus Code 사용 이유

| 특징 | 설명 |
|------|------|
| Google Maps 호환 | Plus Code를 검색창에 입력하면 정확한 위치로 이동 |
| 짧고 간결 | `3F4M+5G6 大安區` vs `No. 123, Section 4, Zhongxiao East Road...` |
| 정확한 위치 | 약 14m x 14m 영역을 고유하게 식별 |

### 사용자 경험 (UX) 흐름

```
1. 사용자가 구글맵에서 좌표 복사: "(25.055701, 121.519953)"
2. 맛집 수정 모달의 주소 필드에 붙여넣기
3. 시스템이 자동으로 좌표 형식 감지
4. 역지오코딩 API 호출 (로딩 표시)
5. Plus Code 주소로 자동 변환: "3F4M+5G6 大安區 臺北市 대만"
6. 좌표도 함께 업데이트
```

### 관련 파일
- `src/components/restaurant-edit-modal.tsx` - 주소 입력 및 좌표 변환 UI
- `src/app/api/reverse-geocode/route.ts` - 역지오코딩 API
- `src/app/api/custom-restaurants/route.ts` - PUT 메서드 (정보 수정)

---

## 12. 리뷰 수정/삭제 기능 구현

### 구현 목표
사용자가 자신의 리뷰를 수정하거나 삭제할 수 있는 기능

### 구현 방법

#### 리뷰 수정 (PUT /api/reviews/[id])
```typescript
// src/app/api/reviews/[id]/route.ts

export async function PUT(request: NextRequest, { params }) {
  const reviewId = (await params).id;

  // JWT 토큰에서 사용자 정보 추출
  const token = request.cookies.get("auth_token")?.value;
  const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

  // 리뷰 조회
  const review = await collection.findOne({ _id: new ObjectId(reviewId) });

  // 본인 리뷰인지 확인
  if (review.user_id !== decoded.userId) {
    return NextResponse.json(
      { success: false, error: "수정 권한이 없습니다." },
      { status: 403 }
    );
  }

  // 리뷰 수정
  const body = await request.json();
  await collection.updateOne(
    { _id: new ObjectId(reviewId) },
    {
      $set: {
        rating: body.rating,
        food_rating: body.food_rating,
        service_rating: body.service_rating,
        atmosphere_rating: body.atmosphere_rating,
        content: body.content,
        photos: body.photos,
        meal_type: body.meal_type,
        updated_at: new Date().toISOString(),
      },
    }
  );

  return NextResponse.json({ success: true, message: "리뷰가 수정되었습니다." });
}
```

#### 리뷰 삭제 (DELETE /api/reviews/[id])
```typescript
export async function DELETE(request: NextRequest, { params }) {
  const reviewId = (await params).id;

  // JWT 토큰에서 사용자 정보 추출
  const token = request.cookies.get("auth_token")?.value;
  const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

  // 리뷰 조회 및 권한 확인
  const review = await collection.findOne({ _id: new ObjectId(reviewId) });
  if (review.user_id !== decoded.userId) {
    return NextResponse.json(
      { success: false, error: "삭제 권한이 없습니다." },
      { status: 403 }
    );
  }

  // 리뷰 삭제
  await collection.deleteOne({ _id: new ObjectId(reviewId) });

  return NextResponse.json({ success: true });
}
```

#### 프론트엔드 리뷰 수정 모달
```typescript
// src/components/review-modal.tsx

// 수정 모드일 때 기존 데이터 로드
useEffect(() => {
  if (editReview) {
    setRating(editReview.rating);
    setFoodRating(editReview.food_rating || 0);
    setServiceRating(editReview.service_rating || 0);
    setAtmosphereRating(editReview.atmosphere_rating || 0);
    setContent(editReview.content);
    setPhotos(editReview.photos || []);
    setMealType(editReview.meal_type || "");
  }
}, [editReview]);

// 수정 또는 새 리뷰 저장
const handleSubmit = async () => {
  const url = editReview
    ? `/api/reviews/${editReview._id}`  // PUT
    : "/api/reviews";                    // POST

  const method = editReview ? "PUT" : "POST";

  const res = await fetch(url, { method, body: JSON.stringify(reviewData) });
  // ...
};
```

### 삭제 확인 모달
```typescript
// 삭제 전 확인 모달 표시
const handleDeleteClick = (review: Review) => {
  setReviewToDelete(review);
  setShowDeleteConfirm(true);
};

// 삭제 확인
const confirmDelete = async () => {
  const res = await fetch(`/api/reviews/${reviewToDelete._id}`, {
    method: "DELETE",
  });

  if (res.ok) {
    // 리뷰 목록에서 제거
    setReviews(reviews.filter(r => r._id !== reviewToDelete._id));
    setShowDeleteConfirm(false);
  }
};
```

### 권한 체계

| 작업 | 권한 |
|------|------|
| 리뷰 작성 | 로그인 사용자 |
| 리뷰 수정 | 본인만 |
| 리뷰 삭제 | 본인만 |

### 관련 파일
- `src/app/api/reviews/[id]/route.ts` - PUT/DELETE API
- `src/components/review-modal.tsx` - 수정 모드 지원
- `src/components/review-section.tsx` - 수정/삭제 버튼, 확인 모달

---

## 13. 사용자 등록 맛집의 맛집알리미 통합

### 문제 상황
앱에서 사용자가 등록한 맛집(custom_restaurants)이 "맛집알리미" 주변 맛집 검색 기능에 나타나지 않는 문제 발생. 정적 데이터(taiwan-food.ts)에 있는 맛집만 검색되고, MongoDB에 저장된 사용자 등록 맛집은 검색 결과에서 제외됨.

### 원인 분석

#### 기존 구조의 한계
```typescript
// 기존: 정적 데이터만 사용
const allRestaurants = useMemo(() => {
  const categories = ["면류", "만두", "밥류", ...] as const;
  const restaurants: Restaurant[] = [];
  categories.forEach((category) => {
    const items = taiwanFoodMap[category];
    if (items) restaurants.push(...items);
  });
  return restaurants;  // 정적 데이터만 반환
}, []);
```

- `taiwanFoodMap`은 코드에 하드코딩된 정적 맛집 데이터
- MongoDB의 `custom_restaurants` 컬렉션은 별도로 관리됨
- 두 데이터 소스가 통합되지 않아 주변 검색에서 사용자 등록 맛집 누락

### 해결 방안

#### 1단계: 사용자 등록 맛집 타입 정의
```typescript
// src/components/nearby-restaurants.tsx

interface CustomRestaurant {
  place_id: string;
  name: string;
  address: string;
  category: string;
  feature?: string;
  coordinates: { lat: number; lng: number };
  google_rating?: number;
  google_reviews_count?: number;
  registered_by?: number;
}
```

#### 2단계: API에서 사용자 등록 맛집 가져오기
```typescript
const [customRestaurants, setCustomRestaurants] = useState<Restaurant[]>([]);
const [isLoadingCustom, setIsLoadingCustom] = useState(false);

useEffect(() => {
  const fetchCustomRestaurants = async () => {
    setIsLoadingCustom(true);
    try {
      const res = await fetch("/api/custom-restaurants");
      const data = await res.json();
      if (data.success && data.data) {
        // CustomRestaurant를 Restaurant 형식으로 변환
        const converted: Restaurant[] = data.data.map((r: CustomRestaurant) => ({
          이름: r.name,
          위치: r.address,
          특징: r.feature || "",
          평점: r.google_rating,
          리뷰수: r.google_reviews_count,
          coordinates: r.coordinates,
          place_id: r.place_id,        // 사용자 등록 맛집 식별자
          category: r.category,
          registered_by: r.registered_by,
        }));
        setCustomRestaurants(converted);
      }
    } catch (error) {
      console.error("사용자 등록 맛집 로드 실패:", error);
    } finally {
      setIsLoadingCustom(false);
    }
  };

  fetchCustomRestaurants();
}, []);
```

#### 3단계: 정적 데이터 + 사용자 등록 맛집 통합
```typescript
const allRestaurants = useMemo(() => {
  const categories = ["면류", "만두", "밥류", "탕류", "디저트", "길거리음식", "카페", "까르푸"] as const;
  const restaurants: Restaurant[] = [];

  // 1. 정적 데이터 추가
  categories.forEach((category) => {
    const items = taiwanFoodMap[category];
    if (items) {
      restaurants.push(...items);
    }
  });

  // 2. 사용자 등록 맛집 추가 ✨ 핵심 변경
  restaurants.push(...customRestaurants);

  return restaurants;
}, [customRestaurants]);  // customRestaurants 의존성 추가
```

#### 4단계: 반경 필터링 적용
```typescript
const nearbyRestaurants = useMemo(() => {
  if (!coordinates) return [];

  // allRestaurants에 정적 + 사용자 등록 맛집 모두 포함
  const filtered = filterByRadius(allRestaurants, coordinates, selectedRadius);
  return filtered;
}, [allRestaurants, coordinates, selectedRadius]);
```

#### 5단계: 사용자 등록 맛집 UI 구분
```typescript
function NearbyRestaurantCard({ restaurant, distance, onSelect }: NearbyRestaurantCardProps) {
  // place_id가 있으면 사용자 등록 맛집
  const isCustom = !!restaurant.place_id;

  return (
    <button onClick={onSelect} className="...">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="font-bold truncate">{restaurant.이름}</h3>
          {/* 사용자 등록 맛집에 카테고리 배지 표시 */}
          {isCustom && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
              {restaurant.category}
            </Badge>
          )}
        </div>
        <span className="text-sm font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
          {distance}
        </span>
      </div>
      {/* ... 나머지 UI */}
    </button>
  );
}
```

### 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────────┐
│                        맛집알리미 (NearbyRestaurants)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐     ┌──────────────────────────────────┐ │
│  │  정적 데이터        │     │   MongoDB (custom_restaurants)    │ │
│  │  taiwanFoodMap   │     │   /api/custom-restaurants        │ │
│  │  (코드에 하드코딩)   │     │   (사용자가 등록한 맛집)            │ │
│  └────────┬─────────┘     └───────────────┬──────────────────┘ │
│           │                               │                     │
│           │    ┌──────────────────────────┘                     │
│           │    │  useEffect로 fetch                             │
│           │    │  CustomRestaurant → Restaurant 변환            │
│           ▼    ▼                                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              allRestaurants (useMemo)                       ││
│  │         정적 데이터 + 사용자 등록 맛집 통합                     ││
│  └─────────────────────────┬───────────────────────────────────┘│
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           filterByRadius(allRestaurants, coordinates)       ││
│  │              Haversine 공식으로 거리 계산                      ││
│  └─────────────────────────┬───────────────────────────────────┘│
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                nearbyRestaurants                            ││
│  │           반경 내 맛집 목록 (거리순 정렬)                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 발생한 부수적 버그: 잘못된 좌표 문제

#### 문제 상황
사용자가 등록한 "Monodon Coffee (一角鯨咖啡)"가 실제 위치(중산구, ~3.2km 거리)와 다른 위치(119m)로 표시됨.

#### 원인 분석
```
저장된 좌표:  lat: 25.0554122, lng: 121.483754  ❌
실제 좌표:   lat: 25.055701,  lng: 121.519953  ✅
                              ↑
                           경도 차이 약 0.036
                           (약 3.2km 오차)
```

- 사용자가 다른 장소(CoCo Curry)의 Plus Code를 Monodon Coffee 주소란에 입력
- 역지오코딩으로 좌표 변환 시 잘못된 좌표가 저장됨
- 맛집알리미에서 잘못된 좌표 기준으로 거리 계산

#### 해결 방법
1. 앱의 맛집 수정 모달에서 정확한 좌표로 수정
2. Google Maps에서 "一角鯨咖啡" 검색하여 정확한 좌표 확인
3. 수정된 좌표: `(25.055701, 121.519953)`

#### 교훈
> **좌표 검증의 중요성**: 사용자 입력 좌표는 항상 Google Places API 등으로 검증 후 저장하는 것이 안전함. Plus Code 변환 시 의도한 장소와 일치하는지 확인 필요.

### 로딩 상태 처리

```typescript
{isLoadingCustom ? (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
    <p className="text-gray-500 dark:text-gray-400">
      맛집 데이터를 불러오는 중...
    </p>
  </div>
) : nearbyRestaurants.length === 0 ? (
  // 결과 없음 UI
) : (
  // 맛집 목록 렌더링
)}
```

### 결과

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 검색 대상 | 정적 데이터만 | 정적 + 사용자 등록 |
| 데이터 소스 | taiwanFoodMap | taiwanFoodMap + MongoDB |
| 사용자 등록 맛집 | 검색 불가 | 검색 가능 ✅ |
| UI 구분 | 없음 | 카테고리 배지 표시 |

### 관련 파일
- `src/components/nearby-restaurants.tsx` - 핵심 변경 (사용자 등록 맛집 통합)
- `src/app/api/custom-restaurants/route.ts` - GET API (맛집 목록 조회)
- `src/lib/geo-utils.ts` - filterByRadius 함수 (거리 계산)
- `src/data/taiwan-food.ts` - 정적 맛집 데이터

### API 응답 예시

```json
// GET /api/custom-restaurants
{
  "success": true,
  "data": [
    {
      "place_id": "ChIJ...",
      "name": "Monodon Coffee",
      "address": "3G5M+5X6 中山區 台北市",
      "category": "카페",
      "feature": "스페셜티 커피",
      "coordinates": { "lat": 25.055701, "lng": 121.519953 },
      "google_rating": 4.5,
      "google_reviews_count": 128,
      "registered_by": 1
    }
  ]
}
```

---

## 12. 화장실 찾기 세븐일레븐 카드 레이아웃 오버플로우 문제

### 문제 상황
화장실 찾기 > 세븐일레븐 탭에서 첫 번째 카드의 거리 및 길찾기 버튼이 카드 우측을 넘어가는 레이아웃 문제가 발생했습니다.

### 원인 분석
- FamilyMart 카드에는 `overflow-hidden`, `min-w-0`, `shrink-0` 등의 flex 레이아웃 제어 클래스가 적용되어 있었음
- 7-ELEVEN 카드에는 해당 클래스들이 누락되어 있어 콘텐츠가 카드 영역을 넘어감

### 해결 방안

#### FamilyMart와 동일하게 7-ELEVEN 카드 레이아웃 수정

**변경 전:**
```tsx
<div className="flex items-start justify-between">
  <div className="flex-1">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="... font-medium">가장 가까움</span>
      <span className="... font-medium">ATM</span>
      <h3 className="font-bold ...">7-ELEVEN {store.name}</h3>
    </div>
    ...
  </div>
  <div className="flex flex-col items-end gap-2 ml-4">
    ...
  </div>
</div>
```

**변경 후:**
```tsx
<div className="flex items-start justify-between overflow-hidden">
  <div className="flex-1 min-w-0 mr-3">
    <div className="flex items-center gap-2">
      <span className="... font-medium shrink-0">가장 가까움</span>
      <span className="... font-medium shrink-0">ATM</span>
      <h3 className="font-bold ... truncate">7-ELEVEN {store.name}</h3>
    </div>
    ...
  </div>
  <div className="flex flex-col items-end gap-2 shrink-0">
    ...
  </div>
</div>
```

### 변경 사항 요약

| 요소 | 변경 내용 |
|------|-----------|
| 외부 div | `overflow-hidden` 추가 |
| 좌측 콘텐츠 div | `min-w-0 mr-3` 추가 (flex 아이템 축소 허용) |
| 배지 컨테이너 | `flex-wrap` 제거 |
| 배지(태그) | `shrink-0` 추가 (축소 방지) |
| 매장명 h3 | `truncate` 추가 (말줄임 처리) |
| 우측 거리/길찾기 div | `ml-4` → `shrink-0` (축소 방지) |

### 관련 파일
- `src/components/toilet-finder.tsx` - 7-ELEVEN 카드 레이아웃 수정 (275-319줄)

---

## 14. iOS PWA에서 구글맵 길찾기 후 빈 화면 문제

### 문제 상황
화장실 찾기 > 길찾기 클릭 > 구글맵 열림 > 다시 "대만맛집" 앱으로 돌아오면 빈 화면이 표시되고, 상단에 Safari의 "검색 또는 웹사이트 이름 입력" 주소창이 나타남.

### 원인 분석
- `window.open(url, "_blank")`를 사용하여 외부 링크(구글맵)를 열었음
- iOS PWA(홈 화면에 추가된 웹앱) 환경에서 `window.open()`은 예상치 못한 동작을 유발
- Safari 브라우저가 열리면서 원래 PWA의 컨텍스트가 손상됨
- 사용자가 앱으로 돌아오면 Safari의 빈 탭 화면이 표시됨

### 해결 방안

#### 문제가 있었던 코드
```typescript
// window.open 사용 (iOS PWA에서 문제 발생)
const openDirections = (store: SevenElevenStore | FamilyMartStore) => {
  const url = store.google_maps_directions_url ||
    `https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}&travelmode=walking`;
  window.open(url, "_blank");  // ❌ iOS PWA에서 문제 발생
};
```

#### 수정된 코드
```typescript
// 동적 anchor 태그 생성 방식 (iOS PWA 호환)
const openDirections = (store: SevenElevenStore | FamilyMartStore) => {
  const url = store.google_maps_directions_url ||
    `https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}&travelmode=walking`;

  // Create and click a link element for better iOS PWA support
  // window.open can cause blank page issues on iOS PWA
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

### 왜 이 방식이 작동하는가?

| 방식 | iOS PWA 동작 |
|------|-------------|
| `window.open()` | JavaScript에서 새 창을 강제로 열려고 함 → PWA 컨텍스트 손상 가능 |
| `<a>` 태그 클릭 | 브라우저가 네이티브하게 링크 처리 → PWA 상태 유지 |

### 다른 외부 링크 처리 방식 비교

```tsx
// 방법 1: <a> 태그 직접 사용 (권장 - 이미 restaurant-detail.tsx에서 사용 중)
<a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
  구글 지도에서 보기
</a>

// 방법 2: 동적 anchor 태그 생성 (버튼 onClick에서 링크를 열어야 할 때)
const link = document.createElement('a');
link.href = url;
link.target = '_blank';
link.rel = 'noopener noreferrer';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);

// 방법 3: window.open (❌ iOS PWA에서 문제 발생 가능)
window.open(url, "_blank");
```

### 권장 사항
- 가능하면 `<a>` 태그를 직접 사용
- 버튼의 onClick 이벤트에서 외부 링크를 열어야 하는 경우, 동적 anchor 태그 생성 방식 사용
- `window.open()`은 iOS PWA 환경에서 피할 것

### 관련 파일
- `src/components/toilet-finder.tsx` - `openDirections` 함수 수정 (138-152줄)
