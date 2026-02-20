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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).Capacitor?.isNativePlatform?.() === true;
}

// ============ 카카오 로그인 ============

export async function kakaoLogin() {
  const redirectUri =
    process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI ||
    `${window.location.origin}/auth/kakao/callback`;

  const restKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  if (!restKey) return;

  const oauthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${restKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;

  if (isCapacitorNative()) {
    // Capacitor 네이티브: Browser 플러그인으로 Chrome Custom Tab에서 OAuth 진행
    // 콜백 페이지에서 딥링크(taiwanfood://auth)로 앱 WebView에 복귀
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: oauthUrl, presentationStyle: "popover" });
  } else {
    window.location.href = oauthUrl;
  }
}
