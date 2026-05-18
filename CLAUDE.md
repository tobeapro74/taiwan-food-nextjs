# 프로젝트 규칙

## 필수 규칙
1. **컨텍스트 90% 경고**: 컨텍스트 사용량이 90%에 도달하면 즉시 사용자에게 알림을 보내고, 지금까지의 개발 상황을 메모리 파일에 저장할 것.
2. **자동 메모라이즈**: 컨텍스트가 부족해지기 전에 현재까지의 작업 진행 상황, 완료된 항목, 남은 작업을 `/Users/byungchulpark/.claude/projects/-Users-byungchulpark-----2026-taiwan-food-nextjs/memory/MEMORY.md`에 업데이트할 것.
3. **세션 연속성**: 새 세션 시작 시 반드시 MEMORY.md를 읽고 이전 작업 상태를 파악한 후 작업을 시작할 것.

## AI 리뷰 분석 (2026-05-18 추가)

### 파일 위치
- 컴포넌트: `src/components/ai-menu-summary.tsx`
- API: `src/app/api/ai-menu-summary/[name]/route.ts`

### 동작 방식
- `restaurant-detail.tsx`에서 `<GoogleReviews onReviewsReady>` → `<AiMenuSummary reviewsReady>` 순서로 실행
- Google 리뷰 캐시(`google_reviews_cache` 컬렉션) 완료 후 AI 분석 시작
- Claude Haiku(`claude-haiku-4-5-20251001`)로 대표 메뉴·리뷰 추출
- 분석 결과 MongoDB `ai_menu_summary` 컬렉션에 7일 캐싱
- 리뷰는 중국어·일본어·영어 등 다국어 가능 → topReviews는 **한국어로 번역** 요약
- topMenus 메뉴명은 원어 유지 (소롱포, 小籠包 등)
- i18n 키: `ai_summary.title / analyzing / based_on_reviews / top_menus / top_reviews`

### 외부 API
- **Anthropic API** (Claude Haiku): AI 리뷰 분석, 대표 메뉴·리뷰 추출
- 환경변수: `ANTHROPIC_API_KEY`
