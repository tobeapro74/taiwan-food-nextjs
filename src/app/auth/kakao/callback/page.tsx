"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    // React Strict Mode 등에서 useEffect 중복 실행 방지
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    // 네이티브 앱에서 보낸 요청은 state=native 파라미터가 있음
    const isNative = searchParams.get("state") === "native";

    if (errorParam) {
      setError(t("kakao.login_cancelled"));
      setTimeout(() => router.replace("/"), 2000);
      return;
    }

    if (!code) {
      setError(t("kakao.no_auth_code"));
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
          setError(data.error || t("kakao.login_failed"));
          setTimeout(() => router.replace("/"), 2000);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inWebView = (window as any).Capacitor?.isNativePlatform?.() === true;

        if (isNative && !inWebView) {
          // 외부 브라우저(Chrome Custom Tab / SFSafariViewController)에서 열린 경우
          // 딥링크로 토큰을 전달하여 앱 WebView로 복귀
          const token = data.data.token;
          const deepLink = `taiwanfood://auth?token=${encodeURIComponent(token)}`;
          window.location.href = deepLink;
        } else {
          // WebView 안이거나 웹 브라우저: 쿠키가 이미 설정됨 → 바로 메인으로 이동
          window.location.replace("/");
        }
      } catch {
        setError(t("kakao.network_error"));
        setTimeout(() => router.replace("/"), 2000);
      }
    };

    processLogin();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
      {error ? (
        <div className="max-w-sm px-4 text-center space-y-3">
          <p className="text-destructive text-sm font-medium">{t("kakao.auth_failed")}</p>
          <p className="text-muted-foreground text-xs break-all whitespace-pre-wrap">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="text-xs text-primary underline"
          >
            {t("kakao.go_home")}
          </button>
        </div>
      ) : (
        <>
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            {t("kakao.processing")}
          </p>
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
