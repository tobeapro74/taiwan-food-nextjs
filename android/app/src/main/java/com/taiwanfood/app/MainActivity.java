package com.taiwanfood.app;

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
        if (!"taiwanfood".equals(uri.getScheme()) || !"auth".equals(uri.getHost())) return;

        // 동일 딥링크 중복 처리 방지
        if (deepLinkHandled) return;
        deepLinkHandled = true;

        String token = uri.getQueryParameter("token");

        // 토큰이 있으면 WebView 쿠키에 설정
        if (token != null && !token.isEmpty()) {
            String serverUrl = "https://www.taiwan-yummy-food.com";
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setCookie(serverUrl, "auth_token=" + token + "; Path=/; Max-Age=604800; Secure; SameSite=Lax");
            cookieManager.flush();
        }

        // 쿠키 동기화 대기 후 메인 페이지로 이동
        getBridge().getWebView().postDelayed(() -> {
            getBridge().getWebView().evaluateJavascript(
                "window.location.replace('/');",
                null
            );
            // 다음 딥링크를 받을 수 있도록 플래그 리셋
            deepLinkHandled = false;
        }, 300);

        // Intent 데이터 초기화 (재처리 방지)
        intent.setData(null);
    }
}
