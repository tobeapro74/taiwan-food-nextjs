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

            // WebView에서 메인 페이지로 이동
            getBridge().getWebView().post(() -> {
                getBridge().getWebView().evaluateJavascript(
                    "window.location.replace('/');",
                    null
                );
            });
        }
    }
}
