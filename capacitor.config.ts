import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taiwanfood.app',
  appName: '대만맛집',
  webDir: 'www',
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true,
    scrollEnabled: true,
  },
  server: {
    // 배포된 웹앱 URL을 로드 (www 포함 - 리다이렉트 방지)
    url: 'https://www.taiwan-yummy-food.com',
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
