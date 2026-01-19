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
