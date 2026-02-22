# 카카오 로그인 적용 가이드 (iOS/Android/Web)

> **이 문서의 목적**: 이 문서 하나만 있으면 새 프로젝트(여의도한끼, n2골프 등)에 카카오 로그인을 처음부터 끝까지 적용할 수 있습니다.
> 카카오 개발자 설정 → 코드 작성 → Vercel 배포 → Xcode 빌드 → App Store Connect 제출까지 순서대로 설명합니다.

---

## 목차

1. [전체 아키텍처](#1-전체-아키텍처)
2. [카카오 개발자 설정](#2-카카오-개발자-설정)
3. [환경 변수 설정](#3-환경-변수-설정)
4. [프론트엔드 코드](#4-프론트엔드-코드)
5. [백엔드 API 코드](#5-백엔드-api-코드)
6. [iOS 네이티브 설정 (Capacitor)](#6-ios-네이티브-설정-capacitor)
7. [Android 네이티브 설정 (Capacitor)](#7-android-네이티브-설정-capacitor)
8. [Vercel 환경 설정 및 배포](#8-vercel-환경-설정-및-배포)
9. [Xcode 빌드 및 App Store Connect 제출](#9-xcode-빌드-및-app-store-connect-제출)
10. [트러블슈팅](#10-트러블슈팅)
11. [체크리스트](#11-체크리스트)

---

## 1. 전체 아키텍처

### 1.1 로그인 흐름 (웹 브라우저)

```
사용자 ──► "카카오 로그인" 버튼 클릭
  │
  ▼
브라우저 ──► 카카오 OAuth 페이지로 이동 (window.location.href)
  │         https://kauth.kakao.com/oauth/authorize?
  │           client_id=REST_API_KEY
  │           &redirect_uri=콜백URL
  │           &response_type=code
  │
  ▼ (카카오 로그인 & 동의)
카카오 서버 ──► 콜백 URL로 리다이렉트
  │             /auth/kakao/callback?code=인가코드
  │
  ▼
콜백 페이지 ──► POST /api/auth/kakao (인가코드 전송)
  │
  ▼
서버 API ──► 카카오에 인가코드로 access_token 교환
  │         https://kauth.kakao.com/oauth/token
  │
  ▼
서버 API ──► access_token으로 사용자 정보 조회
  │         https://kapi.kakao.com/v2/user/me
  │
  ▼
서버 API ──► DB 조회/생성 → JWT 발급 → httpOnly 쿠키 설정
  │
  ▼
콜백 페이지 ──► window.location.replace("/") → 메인 페이지 이동
```

### 1.2 로그인 흐름 (iOS/Android 네이티브 앱)

```
사용자 ──► "카카오 로그인" 버튼 클릭 (WebView 안)
  │
  ▼
WebView ──► @capacitor/browser로 외부 브라우저 오픈 (SFSafariViewController / Chrome Custom Tab)
  │         URL에 state=native 파라미터 추가
  │
  ▼ (카카오 로그인 & 동의)
외부 브라우저 ──► 콜백 URL 로드
  │               /auth/kakao/callback?code=인가코드&state=native
  │
  ▼
콜백 페이지 ──► POST /api/auth/kakao → JWT 토큰 수신
  │
  ▼
콜백 페이지 ──► 딥링크로 앱 복귀
  │             taiwanfood://auth?token=JWT토큰
  │
  ▼
앱 (iOS/Android) ──► 딥링크 수신 → 토큰으로 쿠키 설정 → 메인 페이지 이동
```

### 1.3 파일 구조

```
프로젝트/
├── src/
│   ├── lib/
│   │   └── kakao.ts                          # 카카오 SDK 초기화, 로그인 함수
│   ├── components/
│   │   └── auth-modal.tsx                     # 로그인/회원가입 모달 (카카오 버튼 포함)
│   └── app/
│       ├── auth/kakao/callback/
│       │   └── page.tsx                       # OAuth 콜백 처리 페이지
│       └── api/auth/
│           ├── kakao/route.ts                 # 카카오 인가코드 → 토큰 교환 API
│           ├── set-token/route.ts             # 딥링크 토큰 → 쿠키 설정 API
│           ├── login/route.ts                 # 이메일 로그인 API
│           ├── register/route.ts              # 이메일 회원가입 API
│           ├── me/route.ts                    # 현재 사용자 조회 API
│           ├── send-verification/route.ts     # 이메일 인증 코드 발송 API
│           └── verify-email/route.ts          # 이메일 인증 코드 확인 API
├── ios/
│   └── App/
│       ├── App/
│       │   ├── AppDelegate.swift              # 딥링크 수신 처리
│       │   └── Info.plist                     # URL Scheme 등록
│       └── CapApp-SPM/
│           └── Package.swift                  # Capacitor 플러그인 의존성
├── android/
│   └── app/src/main/
│       ├── java/.../MainActivity.java         # 딥링크 수신 + 쿠키 설정
│       └── AndroidManifest.xml                # URL Scheme + intent-filter
├── capacitor.config.ts                        # Capacitor 설정
└── package.json
```

### 1.4 필요한 npm 패키지

```json
{
  "dependencies": {
    "@capacitor/core": "^8.0.2",
    "@capacitor/cli": "^8.0.2",
    "@capacitor/ios": "^8.0.2",
    "@capacitor/android": "^8.1.0",
    "@capacitor/app": "^8.0.1",
    "@capacitor/browser": "^8.0.1",
    "jsonwebtoken": "^9.0.3",
    "@types/jsonwebtoken": "^9.0.10",
    "bcryptjs": "^3.0.3",
    "mongodb": "^7.0.0",
    "resend": "^6.8.0"
  }
}
```

### 1.5 DB 컬렉션

| 컬렉션 | 용도 |
|---------|------|
| `members` | 사용자 정보 (email, kakao_id, password, name, profile_image 등) |
| `email_verifications` | 이메일 인증 코드 (code, expiresAt, verified) |

---

## 2. 카카오 개발자 설정

### 2.1 앱 생성

1. [카카오 개발자 사이트](https://developers.kakao.com) 접속
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 이름, 사업자명 입력 후 **저장**

### 2.2 키 확인

앱 생성 후 **앱 키** 탭에서 확인:

| 키 이름 | 용도 | 어디서 쓰나 |
|---------|------|------------|
| **REST API 키** | OAuth 인가 URL 생성 (프론트) + 토큰 교환 (서버) | `NEXT_PUBLIC_KAKAO_REST_API_KEY`, `KAKAO_REST_API_KEY` |
| **JavaScript 키** | 카카오 JS SDK 초기화 (선택사항) | `NEXT_PUBLIC_KAKAO_JS_KEY` |

### 2.3 플랫폼 등록

**앱 설정** → **플랫폼** 에서 등록:

#### Web 플랫폼
```
사이트 도메인: https://www.your-domain.com
                https://your-domain.com
                http://localhost:3000        ← (개발용)
```

#### iOS 플랫폼
```
번들 ID: com.yourapp.id
```
> 번들 ID는 Xcode 프로젝트의 Bundle Identifier와 정확히 같아야 합니다.

#### Android 플랫폼
```
패키지명: com.yourapp.id
키 해시: (디버그/릴리즈 키 해시)
```

### 2.4 카카오 로그인 활성화

1. **제품 설정** → **카카오 로그인** → **활성화 설정** → **ON**
2. **Redirect URI** 등록:
   ```
   https://www.your-domain.com/auth/kakao/callback
   ```
   > ⚠️ 이 URL이 코드의 `NEXT_PUBLIC_KAKAO_REDIRECT_URI`와 **정확히 같아야** 합니다.
   > www 유무, http/https, 마지막 슬래시(/) 하나라도 다르면 에러 납니다.

### 2.5 동의 항목 설정

**제품 설정** → **카카오 로그인** → **동의항목**:

| 항목 | 동의 수준 | 필수 여부 |
|------|----------|----------|
| 프로필 정보 (닉네임/프로필 사진) | 필수 동의 | 필수 |
| 카카오계정 (이메일) | 선택 동의 | 선택 |

### 2.6 Client Secret 설정 (선택)

**제품 설정** → **카카오 로그인** → **보안** → **Client Secret** → **코드 생성**
- 활성화 상태를 **사용함**으로 변경
- 생성된 시크릿 코드를 `KAKAO_CLIENT_SECRET` 환경변수에 저장

---

## 3. 환경 변수 설정

### 3.1 필요한 환경 변수

```bash
# ============ 카카오 ============
NEXT_PUBLIC_KAKAO_REST_API_KEY=abc123def456   # 카카오 REST API 키 (프론트에서 OAuth URL 생성)
NEXT_PUBLIC_KAKAO_JS_KEY=js789key              # 카카오 JavaScript 키 (SDK 초기화, 선택사항)
NEXT_PUBLIC_KAKAO_REDIRECT_URI=https://www.your-domain.com/auth/kakao/callback

KAKAO_REST_API_KEY=abc123def456                # 서버에서 토큰 교환용 (NEXT_PUBLIC_ 없는 버전)
KAKAO_CLIENT_SECRET=secret789                  # Client Secret (선택, 보안 강화)

# ============ 인증 ============
JWT_SECRET=your-super-secret-jwt-key-here      # JWT 서명 비밀키 (최소 32자 랜덤 문자열)

# ============ DB ============
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# ============ 이메일 (이메일 회원가입용) ============
RESEND_API_KEY=re_xxxxxxxxxxxx                 # Resend API 키
```

### 3.2 NEXT_PUBLIC_ 접두사 규칙

| 접두사 | 접근 가능 위치 | 예시 |
|--------|--------------|------|
| `NEXT_PUBLIC_` | **브라우저 + 서버** 모두 | OAuth URL 생성 등 |
| 없음 | **서버만** | 토큰 교환, JWT Secret 등 민감 정보 |

> ⚠️ 비밀키(`JWT_SECRET`, `KAKAO_CLIENT_SECRET`)는 절대 `NEXT_PUBLIC_` 접두사를 붙이면 안 됩니다!

### 3.3 새 프로젝트에 적용 시 변경해야 할 값

| 환경변수 | 대만맛집 값 | 새 프로젝트에서 변경 |
|---------|-----------|-------------------|
| `NEXT_PUBLIC_KAKAO_REST_API_KEY` | 대만맛집 카카오 앱 키 | 새 카카오 앱 키 |
| `NEXT_PUBLIC_KAKAO_REDIRECT_URI` | `https://www.taiwan-yummy-food.com/auth/kakao/callback` | 새 도메인으로 변경 |
| `JWT_SECRET` | (비공개) | 새로 생성 |
| `MONGODB_URI` | (비공개) | 새 DB 연결 문자열 |

---

## 4. 프론트엔드 코드

### 4.1 카카오 유틸리티 (`src/lib/kakao.ts`)

이 파일은 카카오 SDK 초기화와 로그인 함수를 제공합니다.

```typescript
// ============ 카카오 SDK 타입 확장 ============

interface KakaoAuth {
  authorize: (options: { redirectUri: string; scope?: string }) => void;
}

export interface KakaoSDK {
  isInitialized: () => boolean;
  init: (appKey: string) => void;
  Auth: KakaoAuth;
}

declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

// ============ SDK 초기화 ============

export function initKakaoSDK(): boolean {
  const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (typeof window === "undefined" || !window.Kakao || !KAKAO_KEY) return false;

  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_KEY);
  }
  return window.Kakao.isInitialized();
}

// ============ Capacitor 환경 감지 ============

function isCapacitorNative(): boolean {
  return (window as any).Capacitor?.isNativePlatform?.() === true;
}

// ============ 카카오 로그인 ============

export async function kakaoLogin() {
  const redirectUri =
    process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI ||
    `${window.location.origin}/auth/kakao/callback`;

  const restKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  if (!restKey) return;

  const native = isCapacitorNative();
  // 네이티브 앱에서는 state=native를 전달하여 콜백에서 딥링크 분기
  const stateParam = native ? "&state=native" : "";
  const oauthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${restKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code${stateParam}`;

  if (native) {
    try {
      // @capacitor/browser로 외부 브라우저 열기 (SFSafariViewController / Chrome Custom Tab)
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: oauthUrl, presentationStyle: "popover" });
    } catch {
      // Browser 플러그인이 없는 경우 (구 빌드) fallback
      window.location.href = oauthUrl;
    }
  } else {
    // 웹 브라우저: 직접 이동
    window.location.href = oauthUrl;
  }
}
```

**핵심 포인트:**
- `state=native` 파라미터: 콜백 페이지에서 "이것이 앱에서 온 요청인지" 판별하는 데 사용
- `@capacitor/browser`: 앱에서 외부 브라우저를 열어 카카오 로그인 진행 (WebView 내에서 OAuth를 하면 쿠키/세션 문제 발생)
- `try/catch`: `@capacitor/browser` 플러그인이 없는 구 빌드 대비 fallback

### 4.2 로그인 모달 카카오 버튼 (`src/components/auth-modal.tsx`)

```typescript
// 카카오 로그인 핸들러
const handleKakaoLogin = async () => {
  setError("");
  initKakaoSDK();

  // 네이티브 앱에서는 모달을 먼저 닫아야 딥링크 복귀 시 모달이 안 보임
  // 웹에서는 페이지 이동이 일어나므로 onClose 불필요 (오히려 언마운트로 이동이 취소됨)
  const isNative = (window as any).Capacitor?.isNativePlatform?.() === true;
  if (isNative) {
    onClose();
  }
  await kakaoLogin();
};
```

**⚠️ 중요: 웹에서 onClose()를 호출하면 안 되는 이유**

```
웹 브라우저에서 카카오 로그인 클릭 시:
1. onClose() 호출 → 모달 컴포넌트 언마운트 (DOM에서 제거)
2. kakaoLogin() 실행 → window.location.href = oauthUrl
3. ❌ 그런데 컴포넌트가 언마운트되면서 window.location.href 변경이 무시될 수 있음
4. 결과: 모달만 닫히고 페이지 이동이 안 됨!

올바른 동작:
- 네이티브 앱: onClose() → Browser.open() (모달 닫고 외부 브라우저 오픈)
- 웹: kakaoLogin()만 호출 (페이지 이동이 자연스럽게 모달을 대체)
```

### 4.3 카카오 로그인 버튼 UI

```tsx
{/* 카카오 로그인 버튼 */}
<button
  type="button"
  onClick={handleKakaoLogin}
  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-medium text-[15px] transition-colors"
  style={{ backgroundColor: "#FEE500", color: "#000000" }}
>
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 0.6C4.029 0.6 0 3.713 0 7.551C0 9.942 1.558 12.048 3.931 13.303L2.933 16.909C2.844 17.221 3.213 17.466 3.479 17.278L7.736 14.41C8.151 14.462 8.572 14.502 9 14.502C13.971 14.502 18 11.389 18 7.551C18 3.713 13.971 0.6 9 0.6Z"
      fill="#000000"
    />
  </svg>
  카카오로 로그인
</button>
```

> 카카오 디자인 가이드: 배경색 `#FEE500`, 텍스트 `#000000`, 카카오 말풍선 아이콘

### 4.4 OAuth 콜백 페이지 (`src/app/auth/kakao/callback/page.tsx`)

```typescript
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const processed = useRef(false);  // ← 중복 실행 방지 (매우 중요!)

  useEffect(() => {
    // React Strict Mode 등에서 useEffect 중복 실행 방지
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    // 네이티브 앱에서 보낸 요청은 state=native 파라미터가 있음
    const isNative = searchParams.get("state") === "native";

    if (errorParam) {
      setError("카카오 로그인이 취소되었습니다.");
      setTimeout(() => router.replace("/"), 2000);
      return;
    }

    if (!code) {
      setError("인가 코드가 없습니다.");
      setTimeout(() => router.replace("/"), 2000);
      return;
    }

    const processLogin = async () => {
      try {
        const res = await fetch("/api/auth/kakao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();

        if (!data.success) {
          setError(data.error || "카카오 로그인에 실패했습니다.");
          setTimeout(() => router.replace("/"), 2000);
          return;
        }

        // Capacitor WebView 안인지 확인
        const inWebView = (window as any).Capacitor?.isNativePlatform?.() === true;

        if (isNative && !inWebView) {
          // 외부 브라우저(SFSafariViewController / Chrome Custom Tab)에서 열린 경우
          // → 딥링크로 토큰을 앱에 전달
          const token = data.data.token;
          const deepLink = `yourapp://auth?token=${encodeURIComponent(token)}`;
          window.location.href = deepLink;
          // 딥링크 실패 시 fallback (1.5초 후 메인으로)
          setTimeout(() => {
            window.location.replace("/");
          }, 1500);
        } else {
          // WebView 안이거나 웹 브라우저: 쿠키가 이미 설정됨 → 바로 이동
          window.location.replace("/");
        }
      } catch {
        setError("네트워크 오류가 발생했습니다.");
        setTimeout(() => router.replace("/"), 2000);
      }
    };

    processLogin();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
      {error ? (
        <div className="max-w-sm px-4 text-center space-y-3">
          <p className="text-destructive text-sm font-medium">카카오 인증에 실패했습니다.</p>
          <p className="text-muted-foreground text-xs break-all whitespace-pre-wrap">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="text-xs text-primary underline"
          >
            메인 페이지로 돌아가기
          </button>
        </div>
      ) : (
        <>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">카카오 로그인 처리 중...</p>
        </>
      )}
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-dvh">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <KakaoCallbackContent />
    </Suspense>
  );
}
```

**핵심 포인트:**

| 포인트 | 설명 |
|--------|------|
| `useRef(false)` | 카카오 인가코드는 **1회만 사용 가능**. React Strict Mode에서 useEffect가 2번 실행되면 두 번째에서 KOE320 에러 발생 |
| `Suspense` 필수 | `useSearchParams()`는 Suspense boundary 안에서만 사용 가능 (Next.js App Router) |
| `isNative && !inWebView` | 외부 브라우저에서만 딥링크 시도. WebView 안이면 쿠키로 바로 처리 |
| `setTimeout 1.5초` | 딥링크 실패 시 (앱이 설치 안 된 경우 등) fallback으로 웹 메인으로 이동 |
| `window.location.replace` | `router.push` 대신 사용: 브라우저 히스토리에 콜백 페이지를 남기지 않기 위해 |

---

## 5. 백엔드 API 코드

### 5.1 카카오 토큰 교환 API (`src/app/api/auth/kakao/route.ts`)

이것이 카카오 로그인의 핵심 서버 로직입니다.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import type { JWTPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY!;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET!;
const KAKAO_REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI!;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "인가 코드가 필요합니다." },
        { status: 400 }
      );
    }

    // ━━━━━━━━━━ 1단계: 인가코드 → access_token 교환 ━━━━━━━━━━
    const tokenParams: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: KAKAO_REDIRECT_URI,
      code,
    };
    if (KAKAO_CLIENT_SECRET) {
      tokenParams.client_secret = KAKAO_CLIENT_SECRET;
    }

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenParams),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("카카오 토큰 교환 실패:", tokenData);
      return NextResponse.json(
        {
          success: false,
          error: `카카오 인증에 실패했습니다. (${tokenData.error_code || tokenData.error || "unknown"}: ${tokenData.error_description || ""})`,
        },
        { status: 401 }
      );
    }

    // ━━━━━━━━━━ 2단계: 사용자 정보 조회 ━━━━━━━━━━
    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const kakaoUser = await userRes.json();

    if (!userRes.ok || !kakaoUser.id) {
      return NextResponse.json(
        { success: false, error: "카카오 사용자 정보를 가져올 수 없습니다." },
        { status: 401 }
      );
    }

    const kakaoId = kakaoUser.id;
    const kakaoNickname = kakaoUser.kakao_account?.profile?.nickname || "카카오 사용자";
    const kakaoProfileImage = kakaoUser.kakao_account?.profile?.profile_image_url || null;
    const kakaoEmail = kakaoUser.kakao_account?.email?.toLowerCase() || null;

    // ━━━━━━━━━━ 3단계: DB 조회/생성 ━━━━━━━━━━
    const db = await connectToDatabase();
    const membersCollection = db.collection("members");

    // 3-a: kakao_id로 기존 사용자 조회
    let user: any = await membersCollection.findOne({ kakao_id: kakaoId });

    if (!user && kakaoEmail) {
      // 3-b: 같은 이메일의 기존 계정이 있으면 kakao_id 연동 (이메일로 가입한 유저)
      const emailUser = await membersCollection.findOne({ email: kakaoEmail });
      if (emailUser) {
        await membersCollection.updateOne(
          { id: emailUser.id },
          {
            $set: {
              kakao_id: kakaoId,
              profile_image: emailUser.profile_image || kakaoProfileImage,
              updated_at: new Date(),
            },
          }
        );
        user = { ...emailUser, kakao_id: kakaoId };
      }
    }

    if (!user) {
      // 3-c: 신규 사용자 생성
      const lastUser = await membersCollection
        .find({})
        .sort({ id: -1 })
        .limit(1)
        .toArray();
      const newId = lastUser.length > 0 ? lastUser[0].id + 1 : 1;

      const now = new Date();
      const newUser = {
        id: newId,
        name: kakaoNickname,
        email: kakaoEmail,
        password: null,         // 카카오 전용 사용자는 비밀번호 없음
        kakao_id: kakaoId,
        profile_image: kakaoProfileImage,
        is_admin: false,
        created_at: now,
        updated_at: now,
      };

      await membersCollection.insertOne(newUser);
      user = newUser;
    }

    // ━━━━━━━━━━ 4단계: JWT 발급 + 쿠키 설정 ━━━━━━━━━━
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email || "",
      name: user.name,
      is_admin: user.is_admin || false,
      profile_image: user.profile_image || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          profile_image: user.profile_image || null,
          is_admin: user.is_admin || false,
        },
        token,    // ← 딥링크로 앱에 전달하기 위해 응답에도 포함
      },
    });

    // httpOnly 쿠키 설정 (웹 브라우저/WebView에서 바로 사용)
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",        // ← "strict"가 아닌 "lax" (외부 리다이렉트에서 쿠키가 전달되려면)
      maxAge: 60 * 60 * 24 * 7,  // 7일
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("카카오 로그인 오류:", error);
    return NextResponse.json(
      { success: false, error: "카카오 로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

**DB 사용자 매칭 로직 (3단계) 상세:**

```
카카오 로그인 시도
     │
     ▼
kakao_id로 members 조회 ──── 있음 → 기존 사용자 로그인
     │
     │ 없음
     ▼
kakaoEmail로 members 조회 ──── 있음 → 기존 이메일 계정에 kakao_id 연동
     │
     │ 없음
     ▼
신규 사용자 생성 (password: null, kakao_id: 설정)
```

### 5.2 딥링크 토큰 쿠키 설정 API (`src/app/api/auth/set-token/route.ts`)

네이티브 앱이 딥링크로 받은 JWT 토큰을 httpOnly 쿠키로 설정할 때 사용합니다.

```typescript
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "토큰이 필요합니다." },
        { status: 400 }
      );
    }

    // 토큰 유효성 검증
    jwt.verify(token, JWT_SECRET) as JWTPayload;

    const response = NextResponse.json({ success: true });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "유효하지 않은 토큰입니다." },
      { status: 401 }
    );
  }
}
```

### 5.3 현재 사용자 조회 API (`src/app/api/auth/me/route.ts`)

페이지 로드 시 쿠키에서 JWT를 읽어 현재 로그인 상태를 확인합니다.

```typescript
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // DB에서 추가 정보 조회 (카카오 전용 사용자인지 등)
    const db = await connectToDatabase();
    const member = await db.collection("members").findOne(
      { id: decoded.userId },
      { projection: { password: 1, kakao_id: 1, profile_image: 1 } }
    );

    return NextResponse.json({
      success: true,
      data: {
        id: decoded.userId,
        name: decoded.name,
        profile_image: member?.profile_image || decoded.profile_image || null,
        is_admin: decoded.is_admin,
        has_password: !!member?.password,   // 카카오 전용 사용자는 false
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { success: false, error: "인증이 필요합니다." },
      { status: 401 }
    );
  }
}
```

### 5.4 JWT 타입 정의 (`src/lib/types.ts` 중 일부)

```typescript
export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  is_admin: boolean;
  profile_image?: string;
}
```

### 5.5 이메일 로그인에서 카카오 사용자 분기 처리 (`src/app/api/auth/login/route.ts`)

카카오로만 가입한 사용자가 이메일 로그인을 시도하면 안내 메시지를 보여줍니다.

```typescript
// 카카오 전용 사용자인 경우
if (!member.password && member.kakao_id) {
  return NextResponse.json(
    { success: false, error: "카카오 로그인으로 가입된 계정입니다. 카카오 로그인을 이용해주세요." },
    { status: 400 }
  );
}
```

---

## 6. iOS 네이티브 설정 (Capacitor)

### 6.1 Capacitor 플러그인 설치

```bash
npm install @capacitor/browser @capacitor/app
npx cap sync ios
```

### 6.2 Package.swift 확인 (`ios/App/CapApp-SPM/Package.swift`)

`npx cap sync ios` 후 자동으로 설정되지만, 아래 내용이 있는지 확인:

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "CapApp-SPM", targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.0.2"),
        .package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app"),
        .package(name: "CapacitorBrowser", path: "../../../node_modules/@capacitor/browser")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser")
            ]
        )
    ]
)
```

### 6.3 Info.plist - URL Scheme 등록

`ios/App/App/Info.plist`에 딥링크 URL Scheme 등록:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>yourapp</string>  <!-- 여기에 앱 스킴 입력: taiwanfood, yeouido, n2golf 등 -->
        </array>
    </dict>
</array>
```

> **대만맛집**: `taiwanfood`, **여의도한끼**: `yeouido`, **n2골프**: `n2golf` 등

### 6.4 AppDelegate.swift

기본 Capacitor 템플릿을 그대로 사용하면 됩니다. `ApplicationDelegateProxy`가 URL을 자동으로 처리합니다.

```swift
import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Capacitor의 ApplicationDelegateProxy가 URL을 처리
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
```

### 6.5 capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourapp.id',
  appName: '앱이름',
  webDir: 'www',
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
  },
  server: {
    // 배포된 웹앱 URL (앱이 이 URL을 WebView로 로드)
    url: 'https://www.your-domain.com',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
```

> ⚠️ `server.url`이 Vercel에 배포된 웹앱 URL과 같아야 합니다.

---

## 7. Android 네이티브 설정 (Capacitor)

### 7.1 AndroidManifest.xml 딥링크 설정

`android/app/src/main/AndroidManifest.xml`:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask"
    android:exported="true">

    <!-- 기본 런처 -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- 딥링크: yourapp://auth?token=xxx -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="yourapp" android:host="auth" />
    </intent-filter>

</activity>
```

> `android:launchMode="singleTask"` 필수: 딥링크로 앱이 다시 열릴 때 새 Activity가 아닌 기존 Activity로 돌아가기 위해

### 7.2 MainActivity.java 딥링크 처리

`android/app/src/main/java/com/yourapp/id/MainActivity.java`:

```java
package com.yourapp.id;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private boolean deepLinkHandled = false;

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleDeepLink(getIntent());
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null || intent.getData() == null) return;

        Uri uri = intent.getData();
        if (!"yourapp".equals(uri.getScheme()) || !"auth".equals(uri.getHost())) return;

        // 동일 딥링크 중복 처리 방지
        if (deepLinkHandled) return;
        deepLinkHandled = true;

        String token = uri.getQueryParameter("token");

        // 토큰을 WebView 쿠키에 설정
        if (token != null && !token.isEmpty()) {
            String serverUrl = "https://www.your-domain.com";
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setCookie(serverUrl,
                "auth_token=" + token + "; Path=/; Max-Age=604800; Secure; SameSite=Lax");
            cookieManager.flush();
        }

        // 쿠키 동기화 대기 후 메인 페이지로 이동
        getBridge().getWebView().postDelayed(() -> {
            getBridge().getWebView().evaluateJavascript(
                "window.location.replace('/');",
                null
            );
            deepLinkHandled = false;
        }, 300);

        // Intent 데이터 초기화 (재처리 방지)
        intent.setData(null);
    }
}
```

---

## 8. Vercel 환경 설정 및 배포

### 8.1 Vercel 환경 변수 설정 (처음 하는 사람 기준)

1. [vercel.com](https://vercel.com) 로그인
2. 프로젝트 선택 → 상단 메뉴에서 **Settings** 탭 클릭
3. 좌측 메뉴에서 **Environment Variables** 클릭
4. 아래 변수들을 하나씩 추가:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_KAKAO_REST_API_KEY` | 카카오 REST API 키 | Production, Preview, Development 모두 체크 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 JavaScript 키 | 모두 체크 |
| `NEXT_PUBLIC_KAKAO_REDIRECT_URI` | `https://www.your-domain.com/auth/kakao/callback` | 모두 체크 |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 | 모두 체크 |
| `KAKAO_CLIENT_SECRET` | Client Secret (있으면) | 모두 체크 |
| `JWT_SECRET` | 랜덤 문자열 (32자+) | 모두 체크 |
| `MONGODB_URI` | MongoDB 연결 문자열 | 모두 체크 |
| `RESEND_API_KEY` | Resend API 키 | 모두 체크 |

5. 각 변수 입력 후 **Save** 클릭

### 8.2 배포 방법

```bash
# 방법 1: Git push (자동 배포)
git add .
git commit -m "feat: 카카오 로그인 추가"
git push

# 방법 2: Vercel CLI (수동 배포)
npx vercel --prod
```

### 8.3 배포 후 확인 사항

- [ ] `https://www.your-domain.com/auth/kakao/callback` 페이지가 열리는지 확인
- [ ] 카카오 로그인 버튼 클릭 → 카카오 OAuth 페이지로 이동하는지 확인
- [ ] 로그인 완료 후 메인 페이지로 돌아오는지 확인
- [ ] 새로고침 후에도 로그인 상태가 유지되는지 확인 (쿠키)

---

## 9. Xcode 빌드 및 App Store Connect 제출

### 9.1 사전 준비

#### Capacitor Sync

```bash
# 프로젝트 루트에서
npx cap sync ios
```

> 이 명령어가 `node_modules`의 Capacitor 플러그인을 iOS 프로젝트에 동기화합니다.

#### Xcode에서 프로젝트 열기

```bash
npx cap open ios
```

또는 직접: `ios/App/App.xcworkspace` 더블클릭

### 9.2 버전 & 빌드 번호 설정

1. Xcode 좌측에서 **App** 프로젝트(파란 아이콘) 클릭
2. **TARGETS** → **App** 선택
3. **General** 탭에서:
   - **Version** (MARKETING_VERSION): `1.2` (App Store에 표시되는 버전)
   - **Build** (CURRENT_PROJECT_VERSION): `1` (같은 버전 내에서 구분하는 빌드 번호)

**버전 규칙:**
```
Version: 1.0 → 1.1 → 1.2 → 2.0 (App Store에 보이는 번호)
Build:   1   → 1   → 1   → 1   (새 버전이면 1부터 다시 시작)

같은 버전에서 재업로드: Version 1.2, Build 1 → Build 2 → Build 3...
```

> ⚠️ **이미 승인된 버전 번호는 다시 사용할 수 없습니다!**
> 예: 1.1이 승인되었으면 1.1로 새 빌드를 올릴 수 없음 → 1.2로 올려야 합니다.

### 9.3 빌드 설정 확인

1. **Signing & Capabilities** 탭:
   - Team: 본인의 Apple Developer Team 선택
   - Bundle Identifier: `com.yourapp.id` (카카오 개발자 설정과 동일해야 함)
   - Provisioning Profile: Automatically manage signing 체크

2. 상단 빌드 대상: **Any iOS Device (arm64)** 선택 (시뮬레이터 아님!)

### 9.4 Archive 생성

1. Xcode 메뉴: **Product** → **Archive**
2. 빌드가 완료되면 **Organizer** 창이 자동으로 열림
3. 방금 생성된 Archive 선택

### 9.5 App Store Connect에 업로드

1. Organizer에서 **Distribute App** 클릭
2. **App Store Connect** 선택 → **Next**
3. **Upload** 선택 → **Next**
4. 옵션 확인 (기본값 유지) → **Next**
5. 서명 확인 → **Upload**
6. ✅ "Upload Successful" 메시지 확인

> 업로드 후 App Store Connect에 빌드가 표시되기까지 **5~15분** 걸릴 수 있습니다.

### 9.6 App Store Connect에서 새 버전 등록

1. [App Store Connect](https://appstoreconnect.apple.com) 로그인
2. **내 앱** → 앱 선택
3. 좌측 **iOS 앱** 아래 **+ 버전 또는 플랫폼** 클릭 (또는 좌측 상단 "+" 버튼)
4. 플랫폼: **iOS**, 버전: `1.2` 입력 → **생성**

### 9.7 빌드 연결 & 정보 입력

1. **빌드** 섹션에서 **빌드 추가** (또는 "+" 버튼)
2. 업로드한 빌드 (1.2, Build 1) 선택 → **완료**
3. **이 버전의 새로운 기능** 입력:
   ```
   - 카카오 로그인 추가
   - 로그인 안정성 개선
   ```
4. 스크린샷: 이전 버전 것이 자동 복사됨 (변경 필요 없으면 그대로)
5. **설명**, **키워드**, **지원 URL** 등 확인 (이전 버전에서 복사됨)

### 9.8 심사 제출

1. 모든 필수 항목 채운 후 우측 상단 **심사를 위해 제출** 클릭
2. 수출 규정 질문에 답변 (암호화 사용? → 예, HTTPS 사용)
3. **제출** 클릭

### 9.9 심사 후

- 심사 기간: 보통 **24~48시간** (빠르면 몇 시간)
- 승인되면:
  - 자동 출시: 바로 App Store에 공개
  - 수동 출시: "버전 출시" 버튼을 직접 눌러야 공개
- 거절되면: 거절 사유 확인 → 수정 → 재제출

---

## 10. 트러블슈팅

### 10.1 KOE320: authorization code not found

**증상**: 콜백 페이지에서 "KOE320" 에러 메시지

**원인**: 카카오 인가코드는 **1회만 사용 가능**. React Strict Mode에서 useEffect가 2번 실행되면 같은 코드로 2번 요청하여 두 번째에서 실패.

**해결**: `useRef`로 중복 실행 방지

```typescript
const processed = useRef(false);

useEffect(() => {
  if (processed.current) return;   // ← 이미 처리했으면 무시
  processed.current = true;
  // ... 로그인 처리
}, []);
```

### 10.2 웹 브라우저에서 딥링크 다이얼로그 표시

**증상**: 맥/웹 브라우저에서 카카오 로그인 시 "이 페이지를 앱에서 열겠습니까?" 팝업

**원인**: 콜백 페이지가 웹/네이티브 구분 없이 항상 딥링크(`taiwanfood://auth`)를 시도

**해결**: `state=native` 파라미터로 구분

```typescript
// kakao.ts에서:
const stateParam = native ? "&state=native" : "";

// callback/page.tsx에서:
const isNative = searchParams.get("state") === "native";
if (isNative && !inWebView) {
  // 딥링크 시도
} else {
  // 쿠키로 바로 처리
}
```

### 10.3 모바일 웹에서 카카오 로그인 버튼 클릭해도 반응 없음

**증상**: 카카오 로그인 버튼 클릭 → 모달만 닫히고 페이지 이동 안 됨

**원인**: `onClose()`가 모달을 언마운트시키면서 `kakaoLogin()`의 `window.location.href` 변경이 무시됨

**해결**: 웹에서는 `onClose()` 호출하지 않기

```typescript
const handleKakaoLogin = async () => {
  const isNative = (window as any).Capacitor?.isNativePlatform?.() === true;
  if (isNative) {
    onClose();    // 네이티브에서만 모달 닫기
  }
  await kakaoLogin();
};
```

### 10.4 iOS 앱에서 무한 스피너 (카카오 로그인 처리 중...)

**증상**: iOS 앱에서 카카오 로그인 후 "카카오 로그인 처리 중..." 스피너가 계속 돌아감

**원인 1**: `@capacitor/browser` 플러그인이 설치 안 되어 OAuth가 WebView 내에서 진행됨. 콜백에서 딥링크를 시도하지만 이미 WebView 안이므로 딥링크가 의미 없음.

**해결 1**: WebView 내인지 확인하여 분기

```typescript
const inWebView = (window as any).Capacitor?.isNativePlatform?.() === true;

if (isNative && !inWebView) {
  // 외부 브라우저 → 딥링크
} else {
  // WebView 또는 웹 → 쿠키로 바로 이동
  window.location.replace("/");
}
```

**원인 2**: 딥링크 실패 시 fallback이 없음

**해결 2**: 딥링크 시도 후 1.5초 타이머

```typescript
window.location.href = deepLink;
setTimeout(() => {
  window.location.replace("/");
}, 1500);
```

### 10.5 iOS Safari 개인 정보 보호 경고

**증상**: iOS에서 카카오 로그인 시 Safari가 "개인 정보 보호" 관련 경고 표시

**원인**: iOS Safari의 ITP(Intelligent Tracking Prevention)가 cross-site 리다이렉트의 쿠키를 차단

**해결**: `sameSite: "lax"` 사용 (strict 대신). Lax는 top-level 네비게이션에서의 쿠키 전달을 허용합니다.

### 10.6 App Store Connect 업로드 에러: "train version is closed"

**증상**: Xcode에서 Archive 업로드 시 "The train version '1.1' is closed for new build submissions"

**원인**: 해당 버전(1.1)이 이미 App Store에 승인/출시되어 더 이상 빌드를 추가할 수 없음

**해결**: 버전 번호를 올려야 합니다.
- Version: 1.1 → **1.2**
- Build: **1** (새 버전이니 1부터 시작)

### 10.7 Redirect URI 불일치 에러 (KOE006)

**증상**: `KOE006: Mismatching redirect URI`

**원인**: 카카오 개발자 설정의 Redirect URI와 코드의 URI가 다름

**확인 체크리스트:**
- [ ] 카카오 개발자 사이트 Redirect URI: `https://www.your-domain.com/auth/kakao/callback`
- [ ] Vercel 환경변수 `NEXT_PUBLIC_KAKAO_REDIRECT_URI`: `https://www.your-domain.com/auth/kakao/callback`
- [ ] www 유무가 같은지?
- [ ] http vs https가 같은지?
- [ ] 마지막 `/` 유무가 같은지?

### 10.8 카카오 로그인 후 프로필 사진이 안 보임

**원인**: 카카오 동의항목에서 "프로필 정보" 동의를 받지 않았거나, 사용자가 거부함

**확인**: 카카오 개발자 사이트 → 동의항목에서 "프로필 정보(닉네임/프로필 사진)"이 **필수 동의**로 설정되어 있는지 확인

### 10.9 `@capacitor/browser` 플러그인 누락

**증상**: 앱에서 카카오 로그인 시 WebView 내에서 OAuth가 진행됨 (외부 브라우저가 안 열림)

**원인**: `npx cap sync ios`를 안 했거나, 플러그인이 Package.swift에 등록 안 됨

**해결:**
```bash
npm install @capacitor/browser
npx cap sync ios
npx cap sync android
```

그 후 `ios/App/CapApp-SPM/Package.swift`에 `CapacitorBrowser` 의존성이 있는지 확인

### 10.10 Android 딥링크가 작동 안 함

**확인 체크리스트:**
- [ ] `AndroidManifest.xml`에 intent-filter가 있는지 (scheme + host)
- [ ] `android:launchMode="singleTask"`인지
- [ ] `MainActivity.java`에 `handleDeepLink()` 코드가 있는지
- [ ] 딥링크 URL 스킴이 콜백 페이지의 deepLink 변수와 같은지

### 10.11 iOS 카카오 로그인 후 팝업(SFSafariViewController)이 안 닫힘

**증상**: iOS 앱에서 카카오 로그인 완료 후 팝업 브라우저가 계속 떠있고, 앱으로 돌아와도 로그인 상태가 반영 안 됨

**원인**: 4가지 복합 원인

| # | 원인 | 설명 |
|---|------|------|
| 1 | `Browser.close()` 미호출 | 딥링크 수신 시 SFSafariViewController를 닫지 않음 |
| 2 | CapacitorHttp 프록시 | `fetch()` POST의 Set-Cookie가 WebView 쿠키에 반영 안 됨 |
| 3 | `new URL()` 파싱 실패 | custom scheme(`taiwanfood://`)은 `new URL()`로 파싱 불안정 |
| 4 | fallback 타이머 | 딥링크 후 1.5초 타이머가 딥링크 동작을 방해 |

**해결**: 4개 파일 수정

1. `set-token/route.ts` — GET 핸들러 추가 (쿠키 설정 + 리다이렉트)
2. `page.tsx` 딥링크 리스너 — `Browser.close()` + `window.location.href` GET + regex 파싱 + cleanup
3. `callback/page.tsx` — fallback setTimeout 제거
4. `Info.plist` — CFBundleURLName 추가 (선택)

> 상세 코드는 TROUBLESHOOTING.md #19 참조

---

## 11. 체크리스트

### 새 프로젝트에 카카오 로그인 적용 시 체크리스트

#### 1단계: 카카오 개발자 설정
- [ ] 카카오 앱 생성
- [ ] REST API 키, JavaScript 키 확인
- [ ] Web 플랫폼에 도메인 등록
- [ ] iOS 플랫폼에 번들 ID 등록
- [ ] Android 플랫폼에 패키지명 + 키 해시 등록
- [ ] 카카오 로그인 활성화
- [ ] Redirect URI 등록 (정확한 URL)
- [ ] 동의항목 설정 (프로필 필수, 이메일 선택)

#### 2단계: 코드 작성
- [ ] `src/lib/kakao.ts` 생성 (SDK 초기화 + 로그인 함수)
- [ ] `src/app/auth/kakao/callback/page.tsx` 생성 (콜백 처리)
- [ ] `src/app/api/auth/kakao/route.ts` 생성 (토큰 교환 API)
- [ ] `src/app/api/auth/set-token/route.ts` 생성 (딥링크 토큰 API)
- [ ] `src/app/api/auth/me/route.ts` 생성 (사용자 조회 API)
- [ ] `src/components/auth-modal.tsx`에 카카오 버튼 추가
- [ ] `src/lib/types.ts`에 JWTPayload 타입 추가
- [ ] 콜백 페이지에 `useRef` 중복 실행 방지 추가
- [ ] 콜백 페이지에 `Suspense` wrapper 추가
- [ ] 딥링크 URL 스킴을 새 앱에 맞게 변경 (예: `n2golf://auth`)

#### 3단계: 네이티브 앱 설정
- [ ] `npm install @capacitor/browser @capacitor/app`
- [ ] `npx cap sync ios && npx cap sync android`
- [ ] `ios/App/App/Info.plist`에 URL Scheme 등록
- [ ] `android/app/src/main/AndroidManifest.xml`에 intent-filter 추가
- [ ] `android/.../MainActivity.java`에 딥링크 처리 코드 추가
- [ ] `capacitor.config.ts`에 서버 URL 설정

#### 4단계: Vercel 배포
- [ ] Vercel 환경변수 모두 설정 (8개)
- [ ] Git push → 배포
- [ ] 웹에서 카카오 로그인 테스트

#### 5단계: App Store Connect 제출
- [ ] `npx cap sync ios`
- [ ] Xcode에서 Version + Build 설정
- [ ] Signing & Capabilities 확인 (Team, Bundle ID)
- [ ] Product → Archive
- [ ] Distribute App → App Store Connect → Upload
- [ ] App Store Connect에서 새 버전 생성
- [ ] 빌드 연결 + 새로운 기능 작성
- [ ] 심사 제출

---

## 부록: 코드에서 변경해야 할 부분 (새 프로젝트)

새 프로젝트에 이 코드를 복사할 때 **반드시 변경해야 할 부분**:

| 파일 | 변경 내용 |
|------|----------|
| `src/app/auth/kakao/callback/page.tsx` | 딥링크 스킴: `taiwanfood://auth` → `newapp://auth` |
| `src/lib/kakao.ts` | 환경변수명은 동일하게 유지 가능 |
| `android/.../MainActivity.java` | 패키지명, 딥링크 스킴, 서버 URL 변경 |
| `android/AndroidManifest.xml` | 딥링크 스킴 변경 (`android:scheme`) |
| `ios/App/App/Info.plist` | 딥링크 스킴 변경 (`CFBundleURLSchemes`) |
| `capacitor.config.ts` | `appId`, `appName`, `server.url` 변경 |
| Vercel 환경변수 | 모든 키 값을 새 프로젝트에 맞게 변경 |
| 카카오 개발자 설정 | 새 앱 생성 후 키 발급 + 도메인/Redirect URI 등록 |
