# 대만맛집 디자인 가이드

## 개요

대만맛집 앱은 따뜻하고 친근한 느낌의 모바일 퍼스트 디자인을 지향합니다. 대만의 활기찬 음식 문화를 반영하여 따뜻한 주황-빨강 색상을 주요 색상으로 사용합니다. 라이트/다크 모드를 모두 지원합니다.

---

## 1. 컬러 시스템

### TDS 3색 체계

컬러 시스템은 **Primary + Accent + Destructive** 3색으로 단순화되어 있습니다. 무지개 색상 하드코딩을 제거하고 이모지·텍스트로 항목을 구분합니다.

### 라이트 테마 (Clean Neutral Tone)

| 용도 | 변수명 | 값 | 설명 |
|------|--------|-----|------|
| **배경** | `--background` | `hsl(15, 8%, 98%)` | 깨끗한 뉴트럴 톤 |
| **전경** | `--foreground` | `hsl(15, 12%, 12%)` | 따뜻한 검정 |
| **카드** | `--card` | `hsl(0, 0%, 100%)` | 순수 흰색 |
| **Primary** | `--primary` | `hsl(15, 90%, 55%)` | 대만 느낌의 따뜻한 주황-빨강 |
| **Primary 전경** | `--primary-foreground` | `hsl(0, 0%, 100%)` | 흰색 텍스트 |
| **Secondary** | `--secondary` | `hsl(15, 6%, 95%)` | 중립 회색 |
| **Muted** | `--muted` | `hsl(15, 5%, 94%)` | 비활성 배경 |
| **Muted 텍스트** | `--muted-foreground` | `hsl(15, 4%, 46%)` | 보조 텍스트 |
| **Accent** | `--accent` | `hsl(36, 78%, 55%)` | 골든 앰버 (별점 등) |
| **Border** | `--border` | `hsl(15, 5%, 90%)` | 테두리 |
| **Destructive** | `--destructive` | `hsl(0, 84.2%, 60.2%)` | 삭제/경고 빨강 |
| **Ring** | `--ring` | `hsl(15, 90%, 55%)` | 포커스 링 (Primary와 동일) |

### 다크 테마 (Deep Warm Dark)

| 용도 | 변수명 | 값 |
|------|--------|-----|
| **배경** | `--background` | `hsl(15, 15%, 7%)` |
| **전경** | `--foreground` | `hsl(15, 5%, 92%)` |
| **카드** | `--card` | `hsl(15, 10%, 11%)` |
| **Primary** | `--primary` | `hsl(15, 85%, 58%)` |
| **Accent** | `--accent` | `hsl(36, 60%, 50%)` |
| **Muted** | `--muted` | `hsl(15, 6%, 14%)` |
| **Border** | `--border` | `hsl(15, 6%, 20%)` |

다크모드는 `ThemeProvider` (`src/components/theme-provider.tsx`)가 관리하며, localStorage에 `theme` 키로 저장합니다. 홈 헤더의 태양/달 아이콘 토글로 전환합니다. iOS 상태바 theme-color도 동적 업데이트 (#FFFFFF ↔ #1C1512).

### 차트 색상

| 용도 | 변수명 | 값 |
|------|--------|-----|
| **차트 1** | `--chart-1` | `hsl(15, 90%, 55%)` | Primary (주황-빨강) |
| **차트 2** | `--chart-2` | `hsl(142, 76%, 36%)` | 초록 |
| **차트 3** | `--chart-3` | `hsl(38, 92%, 50%)` | 노랑 |
| **차트 4** | `--chart-4` | `hsl(217, 91%, 60%)` | 파랑 |
| **차트 5** | `--chart-5` | `hsl(280, 65%, 60%)` | 보라 |

### 브랜드 컬러 활용 (TDS 3색)

- **Primary (주황-빨강)**: 주요 버튼, 활성 네비, CTA, 체크마크, 스텝 아이콘
- **Accent (골든 앰버)**: 별점, 팁/주의 박스, 성별 구분(보조)
- **Destructive (레드)**: 삭제 버튼, 에러 텍스트, 영업종료
- **bg-muted/50**: 정보 박스, 리스트 항목 배경 (통일)
- **bg-card**: 헤더, 모달, 시간대 추천 섹션
- **예외**: Google 로고 SVG(4색), bg-black/50(오버레이), bg-white/*(글래스)

---

## 2. 타이포그래피

### 폰트

- **한글 폰트**: Pretendard Variable (CDN dynamic-subset)
  ```html
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
  ```
- **라틴 폰트**: Geist Sans (`--font-geist-sans`)
- **코드 폰트**: Geist Mono (`--font-geist-mono`)
- **렌더링**: `antialiased` 적용

### Fluid Typography

뷰포트 너비에 따라 자동 스케일되는 유동적 타이포그래피 시스템:

```css
--fluid-base: clamp(0.875rem, 0.8rem + 0.25vw, 1rem);     /* 14-16px */
--fluid-lg: clamp(1.125rem, 1rem + 0.5vw, 1.375rem);       /* 18-22px */
--fluid-xl: clamp(1.25rem, 1.1rem + 0.75vw, 1.625rem);     /* 20-26px */
--fluid-2xl: clamp(1.5rem, 1.3rem + 1vw, 2rem);            /* 24-32px */
--fluid-sm: clamp(0.75rem, 0.7rem + 0.2vw, 0.875rem);      /* 12-14px */
```

사용:
```tsx
<h1 className="text-fluid-2xl font-bold">제목</h1>
<p className="text-fluid-base">본문</p>
```

### 크기 체계

| 용도 | 클래스 | 예시 |
|------|--------|------|
| 페이지 제목 | `text-fluid-2xl font-bold` | 홈 화면 타이틀 |
| 섹션 제목 | `text-fluid-lg font-semibold` | 인기 맛집 |
| 카드 제목 | `text-base font-semibold` | 맛집 이름 |
| 본문 | `text-sm` | 설명 텍스트 |
| 캡션/보조 | `text-xs` | 위치, 리뷰수 |

### 모바일 앱 가독성 오버라이드

모바일 환경에서 가독성 확보를 위해 `globals.css`에서 Tailwind 기본 폰트 크기를 CSS 오버라이드합니다 (사주나우 패턴 적용). 컴포넌트 파일 수정 없이 CSS 1개 파일만 변경하여 전체 적용됩니다.

| 클래스 | Tailwind 기본 | 오버라이드 | line-height |
|--------|-------------|-----------|-------------|
| body 기본 | ~16px | **15px** | 1.6 |
| `text-sm` | 14px | **15px** | 1.55 |
| `text-xs` | 12px | **13px** | 1.5 |
| `text-[10px]`~`text-[11px]` | 10~11px | **12px** | 1.4 |
| `text-[7px]`~`text-[9px]` | 7~9px | **11px** | 1.4 |
| `text-base` | 16px | 변경 없음 | - |

```css
/* globals.css — 모바일 앱 가독성 오버라이드 */
body { font-size: 15px; line-height: 1.6; }
.text-xs { font-size: 13px !important; line-height: 1.5 !important; }
.text-sm { font-size: 15px !important; line-height: 1.55 !important; }
```

> `!important`를 사용하여 Tailwind의 유틸리티 클래스보다 우선 적용. 롤백 시 해당 CSS 규칙만 삭제하면 즉시 원복 가능.

---

## 3. 간격 (Spacing)

### 기본 단위

- **4px 단위** 사용 (Tailwind 기본)
- 주요 간격: `4, 8, 12, 16, 24, 32, 48`

### 적용 가이드

| 요소 | 내부 패딩 | 외부 마진 |
|------|----------|----------|
| 카드 | `p-3` ~ `p-6` | `mb-4` |
| 버튼 | `px-3 py-1.5` ~ `px-4 py-2` | `gap-2` |
| 입력 필드 | `px-3 py-2` | `mb-4` |
| 섹션 | `py-4` ~ `py-6` | `mb-6` ~ `mb-8` |
| 컨텐츠 영역 | `px-4` | - |

---

## 4. 모서리 (Border Radius)

```css
--radius: 0.625rem (10px)

sm: calc(var(--radius) - 4px)  /* 6px  - 버튼, 입력 */
md: calc(var(--radius) - 2px)  /* 8px  - 카드 */
lg: var(--radius)              /* 10px - 모달, 드롭다운 */
xl: calc(var(--radius) + 4px)  /* 14px - 큰 카드 */
2xl: calc(var(--radius) + 8px) /* 18px */
3xl: calc(var(--radius) + 12px) /* 22px */
```

### 컴포넌트별 적용

| 컴포넌트 | 클래스 |
|----------|--------|
| 카드 | `rounded-xl` ~ `rounded-2xl` |
| 벤토 그리드 타일 | `rounded-2xl` |
| 버튼 | `rounded-md` ~ `rounded-xl` |
| 뱃지 | `rounded-full` |
| 입력 필드 | `rounded-xl` |
| 이미지 | `rounded-lg` ~ `rounded-2xl` |
| Glass 시트 | `rounded-t-2xl` |

---

## 5. 그림자 (Shadow)

| 용도 | 클래스 | 사용처 |
|------|--------|--------|
| 카드 기본 | `shadow-card` | 기본 카드 (`0 1px 3px rgba(0,0,0,0.08)`) |
| 카드 호버 | `shadow-card-hover` | 카드 hover (`0 8px 25px rgba(0,0,0,0.12)`) |
| 프리미엄 | `shadow-premium` | 강조 요소 (`0 4px 20px rgba(0,0,0,0.1)`) |
| 기본 | `shadow-sm` | 일반 요소 |
| 큰 | `shadow-lg` | 모달, 오버레이 |

### 인터랙션 그림자

```tsx
// 카드 호버 효과
className="shadow-card hover:shadow-card-hover transition-all"
```

---

## 6. 컴포넌트 스타일

### 카드

```tsx
// 수직형 (리스트) — Long press 미리보기 지원
<Card
  className="cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-card-hover active:scale-[0.98] overflow-hidden"
  style={{ WebkitTouchCallout: "none" }}
  {...longPressHandlers}
>
  <CardContent className="p-0">
    <div className="flex">
      <div className="w-28 h-28 relative overflow-hidden flex-shrink-0 bg-muted rounded-l-2xl">
        {/* Shimmer 로딩 + 이미지 */}
      </div>
      <div className="flex-1 p-3 min-w-0">
        {/* 정보 */}
      </div>
    </div>
  </CardContent>
</Card>

// 수평형 (스크롤)
<Card className="flex-shrink-0 w-44 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-card-hover active:scale-[0.98] overflow-hidden">
  <div className="h-32 relative overflow-hidden bg-muted">
    {/* Shimmer 로딩 + 이미지 */}
  </div>
  <CardContent className="p-3">
    {/* 정보 */}
  </CardContent>
</Card>
```

### Glass Sheet (반투명 글래스 시트)

```css
.glass-sheet {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.dark .glass-sheet {
  background: rgba(30, 30, 40, 0.9);
}
```

바텀시트(`CategorySheet`), 미리보기(`PeekPreview`) 등에 사용.

### Shimmer 로딩

```tsx
// 이미지 로딩 중 shimmer 효과
{!imageLoaded && (
  <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
)}
```

### 빈 상태 (EmptyState)

```tsx
import { EmptyState } from "@/components/ui/empty-state";

<EmptyState
  icon={Search}
  title="검색 결과 없음"
  description="다른 키워드로 검색해보세요"
  action={{ label: "홈으로", onClick: goHome }}
/>
```

### 뱃지

```tsx
// Secondary (야시장)
<Badge variant="secondary" className="bg-accent/20 text-accent-foreground">야시장명</Badge>

// Outline (건물) — 다크모드 호환
<Badge variant="outline" className="text-muted-foreground border-border bg-muted/50">
  <Building2 className="h-3 w-3 mr-1" />빌딩명
</Badge>

// 카테고리 (어두운 배경)
<Badge className="bg-black/60 text-white border-0">🍜 면류</Badge>
```

### 버튼

| Variant | 스타일 | 용도 |
|---------|--------|------|
| `default` | `bg-primary text-white` | 주요 CTA |
| `outline` | `border bg-background` | 보조 버튼 |
| `ghost` | 배경 없음 | 더보기, 닫기 |
| `destructive` | `bg-destructive text-white` | 삭제 |
| `secondary` | `bg-muted` | 카테고리 칩 |

---

## 7. 벤토 그리드 (Bento Grid)

홈 화면의 핵심 네비게이션 UI. 2열 그리드에 3개 타일 배치:

```tsx
<div className="grid grid-cols-2 gap-3">
  {/* 여행 가이드 */}
  <button className="rounded-2xl bg-card border border-border shadow-card p-4 text-left">
    📖 여행 가이드
  </button>

  {/* 화장실 찾기 */}
  <button className="rounded-2xl bg-card border border-border shadow-card p-4 text-left">
    🚽 화장실 찾기
  </button>

  {/* AI 추천 (전체 너비) */}
  <button className="col-span-2 rounded-2xl bg-gradient-to-r from-primary/85 via-primary/70 to-accent/50 p-4">
    🤖 AI 맛집 추천
  </button>
</div>
```

- 여행 가이드, 화장실: 밝은 카드 스타일 (`bg-card border`)
- AI 추천: primary→accent 그라데이션 (전체 너비)
- 야시장은 하단 네비 '야시장별 맛집'과 중복되어 제거됨

---

## 8. 시간대별 추천 섹션

대만 시간(UTC+8) 기준 5개 시간대에 맞는 맛집 추천:

| 시간대 | 시간 | 이모지 | 설명 |
|--------|------|--------|------|
| 아침 | 6-11 | 🌅 | 든든한 아침 맛집 |
| 점심 | 11-14 | 🍽️ | 인기 맛집 추천 |
| 오후 | 14-17 | ☕ | 디저트 & 카페 |
| 저녁 | 17-21 | 🌙 | 저녁 맛집 |
| 야식 | 21-6 | 🌃 | 야시장 맛집 |

밝은 카드 스타일(`bg-card border border-border`)로 표시. 수평 스크롤 카드 레이아웃.

---

## 9. 온보딩 캐러셀

첫 방문 시 표시되는 4단계 풀스크린 캐러셀 (z-[100]):

| 단계 | 이모지 | 그래디언트 | 제목 |
|------|--------|-----------|------|
| 1 | 🍜 | `from-primary to-primary/80` | 환영 |
| 2 | 🗺️ | `from-primary/90 to-primary` | 맛집 탐색 |
| 3 | 📅 | `from-primary/80 to-primary/90` | AI 일정 |
| 4 | 🚀 | `from-primary to-primary/90` | 시작하기 |

- 하단 "다음" 버튼 + 좌우 스와이프 제스처 지원
- Skip 버튼 (우상단)
- 도트 인디케이터 (현재 스텝 `w-8 bg-white`, 완료 `w-2 bg-white/60`, 미래 `w-2 bg-white/30`)
- `localStorage('onboarding_completed')` 로 1회만 표시

---

## 10. 롱프레스 미리보기 (Peek Preview)

카드를 500ms 길게 누르면 풀스크린 블러 오버레이(z-[95])에 미리보기 팝업:

```tsx
<PeekPreview restaurant={restaurant} onClose={...} onViewDetail={...} />
```

- `glass-sheet` 스타일의 중앙 카드
- 이미지(h-48) + 이름 + 평점 + 위치 + 특징 + "상세보기" 버튼
- 진입 애니메이션: scale 0.9→1.0, opacity 0→1 (200ms)
- 외부 탭 또는 터치 해제 시 닫힘
- `useLongPress` 훅: 이동 >10px 시 타이머 취소 (스크롤/PTR과 충돌 방지)

---

## 11. 햅틱 피드백

`useHaptic()` 훅으로 터치 피드백 제공:

| 위치 | 타입 | 패턴 |
|------|------|------|
| 바텀 네비 탭 | `selection` | 5ms |
| 맛집 카드 탭/롱프레스 | `impact` | 10ms |
| 카테고리 시트 선택 | `selection` | 5ms |

- **Android**: `navigator.vibrate()` API
- **iOS**: `window.webkit.messageHandlers.haptic` 네이티브 브리지 (WKWebView)
- iOS Safari/WKWebView에서 vibrate는 no-op이므로 네이티브 브리지 우선 시도

---

## 12. 하단 네비게이션

### 구조

```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-[90]">
  <div className="max-w-md mx-auto flex justify-around items-center py-1">
    <button className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[52px]">
      <div className="flex items-center justify-center w-12 h-7 rounded-full bg-primary/12">
        <Icon className="h-5 w-5 fill-primary/25 scale-105" />
      </div>
      <span className="text-xs font-semibold">라벨</span>
    </button>
  </div>
</nav>
```

### Pill Indicator

활성 탭 아이콘 아래에 rounded-full pill 배경 (`bg-primary/12`):
- 활성: `text-primary`, 아이콘 `fill-primary/25 scale-105`, 라벨 `font-semibold`
- 비활성: `text-muted-foreground`, 배경 `bg-transparent`, 라벨 `font-medium`

### 탭 구성

| 탭 | 아이콘 | 권한 |
|----|--------|------|
| 홈 | `Home` | 전체 |
| 주변맛집 | `Navigation` | 전체 |
| 일정 | `CalendarDays` | 전체 |
| 등록 | `PlusCircle` | 관리자만 |
| 카테고리 | `Grid3X3` | 전체 |
| 야시장 | `Store` | 전체 |

---

## 13. Pull-to-Refresh

홈 화면에서 아래로 당기면 데이터 새로고침:

```tsx
const { pullDistance, isPulling, isRefreshing } = usePullToRefresh({
  onRefresh: async () => { /* reload */ },
  enabled: currentView === "home",
});
```

- `scrollY === 0`일 때만 활성
- 당기는 거리에 따라 화살표 회전
- 임계값(60px) 초과 시 새로고침 실행
- 로딩 중 스피너 표시

---

## 14. 레이아웃

### 페이지 구조

```
┌─────────────────────────────────────────┐
│  Header (검색바, 사용자 메뉴, 다크모드)    │
├─────────────────────────────────────────┤
│  Main Content                           │
│  ┌─────────────────────────────────┐    │
│  │  Container                       │    │
│  │  max-w-md (모바일)               │    │
│  │  md:max-w-3xl lg:max-w-5xl      │    │
│  │  xl:max-w-7xl mx-auto           │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  Bottom Nav (fixed, z-[90])             │
│  safe-area-bottom                       │
└─────────────────────────────────────────┘
```

### 홈 화면 섹션 순서

1. 헤더 (검색바 + 사용자 메뉴 + 다크모드 토글)
2. 인기 맛집 (수평 스크롤 카드)
3. 시간대별 추천 (그래디언트 배경 + 수평 스크롤)
4. 벤토 그리드 (야시장, 가이드, 화장실, AI 추천)
5. 카테고리 그리드 (3열)
6. 지역별 맛집 랭킹
7. 야시장별 맛집

---

## 15. 애니메이션

### 공통 Keyframes (`globals.css`)

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

Tailwind 유틸리티: `animate-fade-in`, `animate-slide-up`, `animate-scale-in`

### 인터랙션 효과

```tsx
// 카드 호버/클릭
className="hover:scale-[1.01] hover:shadow-card-hover active:scale-[0.98] transition-all duration-200"

// 버튼 클릭
className="active:scale-[0.95] transition-all"

// 벤토 타일
className="active:scale-[0.98] transition-transform"
```

### 로딩 애니메이션

```tsx
// Shimmer 펄스
className="animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted"

// 스피너
className="animate-spin"

// 이미지 페이드인
className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
```

---

## 16. 토스트 알림 (Sonner)

`sonner` 라이브러리로 브라우저 `alert()` 대체:

```tsx
import { toast } from "sonner";

toast.success("저장을 완료했습니다");
toast.error("저장에 실패했습니다");
toast.warning("주의가 필요합니다");
```

### UX Writing 규칙 (NDS)

| 유형 | 문구 패턴 | 예시 |
|------|----------|------|
| 성공 | `~를 완료했습니다` | "리뷰 작성을 완료했습니다" |
| 실패 | `~에 실패했습니다` | "저장에 실패했습니다" |
| 유효성 | `~를 선택해주세요` | "카테고리를 선택해주세요" |

- 위치: `top-center` (Toaster는 `layout.tsx`에 한 번 선언)
- **ConfirmDialog**: 브라우저 `confirm()`을 전면 교체한 커스텀 다이얼로그 (아래 별도 섹션 참고)

---

## 17. 확인 다이얼로그 (ConfirmDialog)

브라우저 기본 `confirm()`을 교체하는 커스텀 다이얼로그입니다. Capacitor 앱에서 `confirm()`은 OS 네이티브 다이얼로그(영문 CANCEL/OK)를 표시하므로, 앱 디자인과 한국어 버튼에 맞는 커스텀 컴포넌트를 사용합니다.

### 컴포넌트 (`confirm-dialog.tsx`)

```tsx
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

<ConfirmDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="일정이 저장되지 않았습니다"
  description={"뒤로 가면 현재 일정이 사라집니다.\n이동하시겠습니까?"}
  confirmLabel="예"        // 기본값
  cancelLabel="아니오"     // 기본값
  variant="default"        // "default" | "destructive"
  onConfirm={handleConfirm}
/>
```

### Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `open` | `boolean` | - | 다이얼로그 열림 상태 |
| `onOpenChange` | `(open: boolean) => void` | - | 열림 상태 변경 |
| `title` | `string` | - | 제목 텍스트 |
| `description` | `string` | - | 설명 (줄바꿈 `\n` 지원) |
| `confirmLabel` | `string` | `"예"` | 확인 버튼 텍스트 |
| `cancelLabel` | `string` | `"아니오"` | 취소 버튼 텍스트 |
| `variant` | `"default" \| "destructive"` | `"default"` | 확인 버튼 스타일 |
| `onConfirm` | `() => void` | - | 확인 시 실행 함수 |

### 디자인

- **최대 너비**: `max-w-[320px]`
- **모서리**: `rounded-2xl` (다이얼로그), `rounded-xl` (버튼)
- **닫기 버튼 없음**: `showCloseButton={false}`
- **중앙 정렬**: 제목, 설명 모두 `text-center`
- **줄바꿈 지원**: `whitespace-pre-line`
- **버튼 레이아웃**: 가로 배치 (`flex-row`), 동일 너비 (`flex-1`)
- **destructive 변형**: 확인 버튼이 빨간색

### 적용 위치

| 위치 | 용도 | variant |
|------|------|---------|
| `schedule-main.tsx` | 일정 작성 중 목록 이동 확인 | `default` |
| `schedule-main.tsx` | 저장된 일정 삭제 확인 | `destructive` |
| `schedule-result.tsx` | 저장 전 뒤로가기 확인 | `default` |
| `schedule-result.tsx` | 저장 전 목록 이동 확인 | `default` |

---

## 18. 모바일 최적화

### 터치 최적화

```css
html { -webkit-tap-highlight-color: transparent; }
body { overscroll-behavior-y: contain; }
```

- 롱프레스 시 iOS 기본 컨텍스트 메뉴 방지: `WebkitTouchCallout: "none"`

### Safe Area (iOS)

```css
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
.safe-area-top { padding-top: env(safe-area-inset-top, 0px); }
```

### 뷰포트 설정

```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FF6B6B",
};
```

---

## 19. Z-Index 계층

| 레벨 | 값 | 용도 |
|------|-----|------|
| 콘텐츠 | 기본 | 일반 컨텐츠 |
| 드롭다운 | 50 | 드롭다운 메뉴 |
| 헤더 | 80 | AI 추천 헤더 등 |
| 네비게이션 | 90 | 하단 네비게이션 |
| 바텀 시트 | 95 | Sheet Overlay/Content (카테고리/야시장 팝업) |
| Peek Preview | 95 | 롱프레스 미리보기 |
| 모달/온보딩 | 100 | 모달, 온보딩 |
| 확인 모달 | 110 | 중첩 모달 |
| 회원탈퇴 | 200 | 최상위 모달 |

---

## 20. 아이콘

### 라이브러리

- **Lucide React** 사용
- 크기: `h-4 w-4` (기본), `h-5 w-5` (네비게이션), `h-3 w-3` (작은)

### 카테고리 이모지

```ts
const categoryIcons = {
  "면류": "🍜", "만두": "🥟", "밥류": "🍚",
  "디저트": "🍧", "길거리음식": "🍢", "카페": "☕",
};
```

---

## 21. UI 모던화 히스토리

### Phase 1 (기본 UI 개선)
- Shimmer 로딩 (이미지 placeholder)
- 카드 리뉴얼 (그림자, 호버 효과)
- Creamy 배경색 (`hsl(220, 14%, 96%)`)
- Fluid Typography (clamp 기반)
- 바텀 네비 Pill indicator

### Phase 2 (고급 UX)
- 다크모드 (ThemeProvider + localStorage)
- Bento Grid 레이아웃 (홈 네비게이션)
- Glass 바텀시트 (backdrop-blur)
- 히어로 이미지 (검색바 배경)
- Pull-to-Refresh (홈 화면)

### Phase 3 (인터랙션 & AI)
- 시간대별 맛집 추천 (UTC+8 기준)
- 햅틱 피드백 (Web Vibration + iOS 네이티브 브리지)
- 카드 롱프레스 미리보기 (Peek Preview)
- AI 맛집 추천 (GPT-4o-mini)
- 온보딩 캐러셀 (스와이프 제스처)
