"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inWebView = (window as any).Capacitor?.isNativePlatform?.() === true;

        if (isNative && !inWebView) {
          // 외부 브라우저(Chrome Custom Tab / SFSafariViewController)에서 열린 경우
          // 딥링크로 토큰을 전달하여 앱 WebView로 복귀
          const token = data.data.token;
          const deepLink = `taiwanfood://auth?token=${encodeURIComponent(token)}`;
          window.location.href = deepLink;
          // 딥링크 실패 시 (구 빌드 등) fallback: 쿠키는 이미 설정됨
          setTimeout(() => {
            window.location.replace("/");
          }, 1500);
        } else {
          // WebView 안이거나 웹 브라우저: 쿠키가 이미 설정됨 → 바로 메인으로 이동
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
          <p className="text-sm text-muted-foreground">
            카카오 로그인 처리 중...
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
