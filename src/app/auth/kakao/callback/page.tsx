"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError("카카오 로그인이 취소되었습니다.");
      // 네이티브앱이면 딥링크로 복귀
      tryReturnToApp();
      setTimeout(() => router.replace("/"), 2000);
      return;
    }

    if (!code) {
      setError("인가 코드가 없습니다.");
      tryReturnToApp();
      setTimeout(() => router.replace("/"), 2000);
      return;
    }

    const processLogin = async () => {
      try {
        setDebugInfo("API 호출 중...");
        const res = await fetch("/api/auth/kakao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        setDebugInfo(`응답: ${res.status} ${JSON.stringify(data).slice(0, 200)}`);

        if (!data.success) {
          setError(data.error || "카카오 로그인에 실패했습니다.");
          // 에러 시에도 앱으로 복귀 시도
          tryReturnToApp();
          return;
        }

        const token = data.data.token;

        if (token) {
          // 딥링크로 Capacitor 앱 복귀 (토큰 전달)
          const deepLink = `taiwanfood://auth?token=${encodeURIComponent(token)}`;
          window.location.href = deepLink;
        }

        // 딥링크가 실패하면 (웹 환경) 일반 리다이렉트
        setTimeout(() => {
          window.location.replace("/");
        }, 1500);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "unknown";
        setError(`네트워크 오류: ${errMsg}`);
        setDebugInfo(`catch 에러: ${errMsg}`);
        tryReturnToApp();
        setTimeout(() => router.replace("/"), 3000);
      }
    };

    processLogin();
  }, [searchParams, router]);

  // 네이티브 앱으로 복귀 시도 (에러 시에도)
  const tryReturnToApp = () => {
    setTimeout(() => {
      window.location.href = "taiwanfood://auth";
    }, 500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
      {error ? (
        <div className="max-w-sm px-4 text-center space-y-3">
          <p className="text-destructive text-sm font-medium">카카오 인증에 실패했습니다.</p>
          <p className="text-muted-foreground text-xs break-all whitespace-pre-wrap">{error}</p>
          {debugInfo && (
            <p className="text-muted-foreground text-[10px] break-all whitespace-pre-wrap bg-muted p-2 rounded">{debugInfo}</p>
          )}
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
          {debugInfo && (
            <p className="text-muted-foreground text-[10px] break-all max-w-xs">{debugInfo}</p>
          )}
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
