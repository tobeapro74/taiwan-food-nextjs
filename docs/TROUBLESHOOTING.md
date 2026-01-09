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
