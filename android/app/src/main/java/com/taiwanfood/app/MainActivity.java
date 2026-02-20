package com.taiwanfood.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
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
        String scheme = uri.getScheme();
        String host = uri.getHost();

        // taiwanfood://auth?token=xxx
        if ("taiwanfood".equals(scheme) && "auth".equals(host)) {
            String token = uri.getQueryParameter("token");

            // 토큰이 있으면 WebView 쿠키에 설정
            if (token != null && !token.isEmpty()) {
                String serverUrl = "https://www.taiwan-yummy-food.com";
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setCookie(serverUrl, "auth_token=" + token + "; Path=/; Max-Age=604800; Secure; SameSite=Lax");
                cookieManager.flush();
            }

            // 즉시 로딩 오버레이를 표시하여 기존 화면(모달 등)을 가림
            getBridge().getWebView().post(() -> {
                getBridge().getWebView().evaluateJavascript(
                    "(function(){" +
                    "var o=document.createElement('div');" +
                    "o.id='kakao-loading';" +
                    "o.style.cssText='position:fixed;inset:0;z-index:99999;background:#fff;display:flex;align-items:center;justify-content:center;';" +
                    "o.innerHTML='<div style=\"text-align:center\"><div style=\"width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:#f97316;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto\"></div><p style=\"margin-top:12px;color:#6b7280;font-size:14px\">로그인 처리 중...</p></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';" +
                    "document.body.appendChild(o);" +
                    "})()",
                    null
                );
            });

            // 쿠키 동기화 대기 후 메인 페이지로 이동
            getBridge().getWebView().postDelayed(() -> {
                getBridge().getWebView().evaluateJavascript(
                    "window.location.replace('/');",
                    null
                );
            }, 500);
        }
    }
}
