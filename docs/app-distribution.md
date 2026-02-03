# 대만맛집 iOS 앱 배포 가이드

App Store 출시를 위한 전체 과정을 단계별로 정리한 문서입니다.

---

## 목차

1. [프로젝트 정보](#프로젝트-정보)
2. [계정 및 서비스 정보](#계정-및-서비스-정보)
3. [진행 상황 체크리스트](#진행-상황-체크리스트)
4. [Part 1: Capacitor 설정](#part-1-capacitor-설정)
5. [Part 2: 도메인 및 개인정보 처리방침](#part-2-도메인-및-개인정보-처리방침)
6. [Part 3: Xcode 설정 및 빌드](#part-3-xcode-설정-및-빌드)
7. [Part 4: App Store Connect 등록](#part-4-app-store-connect-등록)
8. [Part 5: 심사 제출](#part-5-심사-제출)
9. [문제 해결 (Troubleshooting)](#문제-해결-troubleshooting)

---

## 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 앱 이름 | 대만맛집 |
| Bundle Identifier | `com.taiwanfood.app` |
| 버전 | 1.0.0 |
| 빌드 | 1 |
| 웹 URL | https://taiwan-yummy-food.com |
| Vercel URL | https://taiwan-food-nextjs.vercel.app |
| 개인정보 처리방침 | https://taiwan-yummy-food.com/privacy |
| 고객지원 | https://taiwan-yummy-food.com/support |
| GitHub | https://github.com/tobeapro74/taiwan-food-nextjs |
| 테스트 계정 | test@test.com / test1234 |

---

## 계정 및 서비스 정보

| 서비스 | URL | 계정 | 비고 |
|--------|-----|------|------|
| Apple Developer | developer.apple.com | tobeapro@gmail.com | 연간 $99 |
| App Store Connect | appstoreconnect.apple.com | tobeapro@gmail.com | - |
| Vercel | vercel.com | - | 배포 플랫폼 |
| Namecheap | namecheap.com | tobeapro@gmail.com | 도메인 |
| MongoDB Atlas | cloud.mongodb.com | - | 데이터베이스 |
| Cloudinary | cloudinary.com | - | 이미지 저장소 |

---

## 진행 상황 체크리스트

### 완료된 작업 ✅

- [x] **Capacitor 설치 및 설정** (2025-02-03)
  - @capacitor/core, @capacitor/cli, @capacitor/ios 설치
  - capacitor.config.ts 생성

- [x] **iOS 프로젝트 생성** (2025-02-03)
  - `npx cap add ios` 실행
  - ios/App/App.xcodeproj 생성됨

- [x] **앱 아이콘 설정** (2025-02-03)
  - 1024x1024 AppIcon 설정 완료
  - ios/App/App/Assets.xcassets/AppIcon.appiconset/

- [x] **Info.plist 설정** (2025-02-03)
  - 앱 이름: 대만맛집
  - 카메라 권한 설명 추가
  - 사진 라이브러리 권한 설명 추가

- [x] **도메인 구매** (2025-02-03)
  - Namecheap에서 taiwan-yummy-food.com 구매

- [x] **Vercel 도메인 연결** (2025-02-03)
  - DNS 설정 완료
  - SSL 인증서 발급 완료

- [x] **개인정보 처리방침 페이지** (2025-02-03)
  - /privacy 페이지 생성
  - https://taiwan-yummy-food.com/privacy

- [x] **고객지원 페이지** (2025-02-03)
  - /support 페이지 생성
  - https://taiwan-yummy-food.com/support

- [x] **테스트 계정 추가** (2025-02-03)
  - App Store 심사용 테스트 계정 (test@test.com / test1234)

- [x] **PWA 바로가기 아이콘 적용** (2025-02-03)
  - App Store 아이콘(Foodie Map 딤섬)을 PWA 아이콘으로 적용
  - icon-192.png, icon-512.png, apple-touch-icon.png 생성
  - Next.js App Router용 icon.png, apple-icon.png 생성

- [x] **Git 커밋 및 배포** (2025-02-03)
  - Vercel 자동 배포 완료

### 진행 중 🔄

- [ ] **Xcode 빌드 및 Archive**
  - Signing & Capabilities 설정
  - Archive 생성
  - App Store Connect 업로드

### 대기 중 ⏳

- [ ] **App Store Connect 앱 등록**
- [ ] **심사 제출**
- [ ] **심사 통과 및 출시**

---

## Part 1: Capacitor 설정

### 1-1. Capacitor 패키지 설치

```bash
cd /Users/byungchulpark/앱개발_2026/taiwan-food-nextjs
npm install @capacitor/core @capacitor/cli @capacitor/ios
```

### 1-2. capacitor.config.ts 생성

```typescript
// capacitor.config.ts
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
    url: 'https://taiwan-yummy-food.com',
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
```

### 1-3. iOS 프로젝트 생성

```bash
# www 폴더 생성 (Capacitor가 요구)
mkdir -p www
echo '<!DOCTYPE html><html><head><title>대만맛집</title></head><body></body></html>' > www/index.html

# iOS 프로젝트 추가
npx cap add ios

# iOS 동기화
npx cap sync ios
```

### 1-4. Info.plist 권한 설정

`ios/App/App/Info.plist`에 다음 권한 추가됨:

```xml
<key>NSCameraUsageDescription</key>
<string>리뷰에 사진을 첨부하기 위해 카메라 접근 권한이 필요합니다.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>리뷰에 사진을 첨부하기 위해 사진 라이브러리 접근 권한이 필요합니다.</string>
```

---

## Part 2: 도메인 및 개인정보 처리방침

### 2-1. Namecheap 도메인 구매

1. [namecheap.com](https://namecheap.com) 접속
2. `taiwan-yummy-food` 검색
3. `.com` 도메인 구매 (연간 ~$10)

### 2-2. Vercel 도메인 연결

1. Vercel 대시보드 → taiwan-food-nextjs 프로젝트
2. Settings → Domains
3. `taiwan-yummy-food.com` 추가

### 2-3. Namecheap DNS 설정

| Type | Host | Value |
|------|------|-------|
| A Record | @ | 216.150.1.1 |
| CNAME | www | cname.vercel-dns.com |

### 2-4. 개인정보 처리방침 페이지

`src/app/privacy/page.tsx` 생성:

```typescript
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">개인정보 처리방침</h1>
      {/* ... 내용 ... */}
    </div>
  );
}
```

**URL:** https://taiwan-yummy-food.com/privacy

---

## Part 3: Xcode 설정 및 빌드

### 3-1. Xcode 프로젝트 열기

```bash
npx cap open ios
# 또는
open ios/App/App.xcodeproj
```

### 3-2. Signing & Capabilities 설정

1. 좌측 Navigator에서 **App** 프로젝트 클릭
2. **TARGETS > App** 선택
3. **Signing & Capabilities** 탭 클릭
4. **Automatically manage signing** 체크
5. **Team**: Apple Developer 계정 선택
6. **Bundle Identifier**: `com.taiwanfood.app` 확인

### 3-3. General 탭 설정

| 항목 | 값 |
|------|-----|
| Display Name | 대만맛집 |
| Bundle Identifier | com.taiwanfood.app |
| Version | 1.0.0 |
| Build | 1 |

### 3-4. Archive 생성

1. 상단 디바이스 선택에서 **Any iOS Device (arm64)** 선택
2. 메뉴: **Product → Archive** 클릭
3. 빌드 완료까지 대기 (몇 분 소요)
4. **Organizer** 창 자동 열림

### 3-5. App Store Connect 업로드

1. Organizer에서 생성된 Archive 선택
2. **Distribute App** 클릭
3. **App Store Connect** 선택 → Next
4. **Upload** 선택 → Next
5. 옵션 확인 → Next
6. 인증서 선택 → Next
7. **Upload** 클릭
8. 키체인 암호 입력 (Mac 로그인 암호) → **항상 허용** 선택
9. **Upload Succeeded** 확인

---

## Part 4: App Store Connect 등록

### 4-1. App Store Connect 접속

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) 접속
2. Apple ID로 로그인

### 4-2. 새 앱 생성

1. **나의 앱** 클릭
2. **+** 버튼 → **신규 앱** 선택
3. 앱 정보 입력:

| 항목 | 값 |
|------|-----|
| 플랫폼 | iOS |
| 이름 | 대만맛집 |
| 기본 언어 | 한국어 |
| 번들 ID | com.taiwanfood.app |
| SKU | taiwanfood001 |

### 4-3. 앱 정보 입력

1. **카테고리**: 음식 및 음료
2. **콘텐츠 권한**: 편집 → Google Maps 사용하면 "예" 선택

### 4-4. 개인정보 처리방침

1. 좌측 메뉴 **앱 개인정보 보호** 클릭
2. **개인정보 처리방침 URL** 입력:
   - `https://taiwan-yummy-food.com/privacy`
3. 데이터 수집 여부 선택

### 4-5. 스크린샷 업로드

**iPhone 스크린샷 (필수)**
- 6.7인치 (iPhone 14 Pro Max): 1290 x 2796 픽셀
- 최소 1장, 최대 10장

**iPad 스크린샷 (iPad 지원 시)**
- 12.9인치: 2048 x 2732 픽셀

### 4-6. 앱 설명 입력

```
대만 맛집을 한눈에!

- 현지인이 추천하는 진짜 맛집
- 지도에서 바로 확인
- 실시간 리뷰와 평점
- 영업시간, 메뉴 정보 제공
- 야시장 정보 완벽 수록
```

**키워드** (100자 이내):
```
대만,맛집,여행,음식,타이베이,야시장,딘타이펑,망고빙수,버블티
```

### 4-7. 빌드 선택

1. **빌드** 섹션에서 **+** 버튼 클릭
2. Xcode에서 업로드한 빌드 선택
3. 암호화 관련 질문: HTTPS만 사용 → "아니요" 선택

### 4-8. 앱 심사 정보

```
Demo Account Login:
- Email: test@test.com
- Password: test1234

If you want to test sign-up:
- Use any email ending with @test.com or @example.com
- Verification code is always: 123456
```

---

## Part 5: 심사 제출

### 5-1. 최종 확인

- [ ] 모든 필수 항목 입력됨
- [ ] 빨간색 경고 없음
- [ ] 앱 상태: "제출 준비 완료"

### 5-2. 심사 제출

1. 우측 상단 **심사를 위해 제출** 클릭
2. 제출 확인

### 5-3. 심사 대기

- 앱 상태: **심사 대기 중**
- 예상 기간: 24시간 ~ 3일
- 결과: 이메일로 통보

---

## 문제 해결 (Troubleshooting)

### 자주 발생하는 문제

#### 1. "Invalid app icon" 에러
**원인:** 앱 아이콘에 투명 배경(alpha channel)이 있음

**해결:**
- 포토샵/피그마에서 배경을 흰색으로 채우고 PNG로 저장
- 1024x1024 픽셀, 투명 배경 없이

#### 2. Archive 메뉴가 비활성화
**원인:** 시뮬레이터가 선택되어 있음

**해결:**
- 상단에서 **Any iOS Device (arm64)** 선택

#### 3. 빌드가 App Store Connect에 안 보임
**원인:** 처리 시간 필요

**해결:**
- 10~15분 대기 후 새로고침
- 이메일로 처리 완료 알림 확인

#### 4. iPad 스크린샷 필요 에러
**해결 방법 1:** iPad 스크린샷 추가
- 시뮬레이터에서 iPad Pro 13인치 선택
- Cmd + S로 스크린샷 촬영

**해결 방법 2:** iPhone 전용으로 설정
- Xcode → General → Deployment Info → iPhone만 체크

#### 5. 회원탈퇴 기능 없음 거부
**원인:** Apple 정책상 계정 생성 시 삭제 기능도 필수

**해결:**
- 회원탈퇴 API 및 UI 구현 필요
- 여의도한끼 코드 참고

#### 6. 카메라 크래시 거부
**원인:** Capacitor WKWebView에서 HTML5 file input 문제

**해결:**
- @capacitor/camera 플러그인 사용
- 네이티브 카메라 API 호출

---

## 버전 히스토리

| 버전 | 빌드 | 날짜 | 상태 | 비고 |
|------|------|------|------|------|
| 1.0 | 1 | 2026-02-03 | 준비 중 | 최초 제출 준비 |

---

## 유용한 명령어

```bash
# Capacitor iOS 동기화
npx cap sync ios

# Xcode 프로젝트 열기
npx cap open ios

# 빌드 확인
npm run build

# Git 커밋 및 푸시
git add .
git commit -m "message"
git push
```

---

## 참고 링크

- [Apple Developer Program](https://developer.apple.com/programs/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [App Store 심사 지침](https://developer.apple.com/app-store/review/guidelines/)
- [Capacitor 공식 문서](https://capacitorjs.com/docs)
- [여의도한끼 배포 문서](../여의도%20맛집_nextjs/docs/app%20distribution.md)

---

*마지막 업데이트: 2026년 2월 3일*
