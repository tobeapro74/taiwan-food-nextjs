# 타이베이 여행 스케줄러 DB 스키마

## MongoDB 컬렉션 구조

---

## 1. `schedule_places` - 장소 정보 (맛집/관광지/카페/쇼핑)

```javascript
{
  _id: ObjectId,

  // 기본 정보
  name: "딩타이펑 신이본점",
  name_en: "Din Tai Fung Xinyi",
  name_zh: "鼎泰豐 信義店",

  type: "restaurant",  // restaurant | attraction | cafe | shopping
  category: "샤오롱바오",  // 세부 카테고리

  // 위치 정보
  location: {
    district: "신이구",
    district_en: "Xinyi",
    address: "台北市信義區市府路45號",
    coordinates: {
      lat: 25.0339,
      lng: 121.5619
    },
    nearest_mrt: "타이베이101/세계무역센터역",
    walking_from_mrt: 5  // 분
  },

  // 평가 정보
  rating: 4.7,
  review_count: 15000,
  price_range: "$$",  // $ | $$ | $$$ | $$$$
  avg_budget: 500,  // NT$ 1인 기준

  // 운영 정보
  hours: {
    weekday: "10:00-21:00",
    weekend: "10:00-21:30",
    closed: null
  },
  avg_wait_time: 30,  // 분 (피크 시간대)
  reservation: true,

  // 연령대별 적합도 (1-5점)
  age_suitability: {
    "10s": 4,
    "20s": 5,
    "30s": 5,
    "40s": 5,
    "50s": 5,
    "60s_plus": 5
  },

  // 접근성/편의성
  accessibility: {
    wheelchair: true,
    elevator: true,
    parking: true,
    stroller_friendly: true
  },

  // 방문 정보
  visit_duration: 60,  // 분
  best_time_slots: ["lunch", "dinner"],
  crowded_times: ["12:00-13:00", "18:00-19:30"],

  // 특징 태그
  tags: ["줄서는맛집", "관광객필수", "가족식사", "에어컨"],
  features: "세계적으로 유명한 샤오롱바오 전문점",

  // 추천 메뉴/활동
  highlights: [
    { name: "샤오롱바오", price: 220, must_try: true },
    { name: "새우볶음밥", price: 280, must_try: false }
  ],

  // 인근 장소 (동선 최적화용)
  nearby_places: [
    { place_id: "taipei101", distance: 200, walking_time: 3 },
    { place_id: "xinyi_shopping", distance: 100, walking_time: 2 }
  ],

  // 메타 정보
  created_at: ISODate("2024-01-01"),
  updated_at: ISODate("2024-01-20"),
  data_source: "manual",  // manual | google_places | crawling
  verified: true
}
```

---

## 2. `schedule_districts` - 지역/구역 정보

```javascript
{
  _id: ObjectId,

  name: "시먼딩",
  name_en: "Ximending",
  name_zh: "西門町",

  district: "만화구",

  // 특성
  vibe: ["젊은감성", "쇼핑", "먹거리", "야경"],
  best_for: ["20대", "30대", "쇼핑", "야시장"],

  // 연령대별 추천도
  age_recommendation: {
    "10s": 5,
    "20s": 5,
    "30s": 4,
    "40s": 3,
    "50s": 2,
    "60s_plus": 2
  },

  // 교통
  main_mrt_stations: ["시먼역"],
  taxi_from_taipei_main: 10,  // 분

  // 추천 방문 시간대
  best_visit_time: {
    morning: 2,    // 1-5 추천도
    afternoon: 4,
    evening: 5,
    night: 5
  },

  // 소요 시간
  recommended_hours: 3,  // 시간

  // 이 지역의 대표 장소들
  key_places: [
    { place_id: "ximending_walking_street", type: "shopping" },
    { place_id: "ay_chung_noodle", type: "restaurant" },
    { place_id: "modern_toilet", type: "restaurant" }
  ],

  // 주의사항
  tips: [
    "주말 오후는 매우 혼잡합니다",
    "야시장은 17시 이후 오픈",
    "현금 준비 필수"
  ],

  // 인근 지역 (동선용)
  nearby_districts: [
    { district_id: "longshan", travel_time: 10, transport: "MRT" },
    { district_id: "zhongzheng", travel_time: 5, transport: "도보" }
  ]
}
```

---

## 3. `schedule_age_preferences` - 연령대별 취향 데이터

```javascript
{
  _id: ObjectId,

  age_group: "20s",  // 10s | 20s | 30s | 40s | 50s | 60s_plus
  gender: "all",     // male | female | all

  // 음식 취향
  food_preferences: {
    favorite_types: ["야시장음식", "버블티", "감성카페", "로컬맛집"],
    avoid_types: ["너무 고급스러운 곳", "전통 찻집"],
    price_sensitivity: "medium",  // low | medium | high
    adventurous: true,  // 새로운 음식 도전 의향
    spicy_tolerance: "high",
    meal_style: "간편식 선호"
  },

  // 쇼핑 취향
  shopping_preferences: {
    favorite_items: ["스트리트패션", "스니커즈", "캐릭터굿즈", "카페소품"],
    favorite_areas: ["시먼딩", "용캉제", "동취"],
    budget_per_trip: "NT$3000-5000",
    brand_preference: "로컬브랜드 + 글로벌SPA"
  },

  // 활동 취향
  activity_preferences: {
    interests: ["포토존", "SNS핫플", "체험활동", "야시장"],
    avoid: ["단체관광", "긴 대기시간"],
    photo_importance: "very_high",
    culture_interest: "medium"
  },

  // 이동 성향
  mobility: {
    walking_tolerance: "high",  // 하루 2만보 OK
    max_walking_minutes: 60,    // 연속 도보 최대
    preferred_transport: ["MRT", "도보", "YouBike"],
    taxi_usage: "가끔"
  },

  // 일정 스타일
  schedule_style: {
    pace: "빠름",  // 느림 | 보통 | 빠름
    places_per_day: 5,  // 하루 평균 방문 장소
    rest_needs: "적음",
    night_activity: true,
    early_morning: false
  },

  // SNS/기록
  documentation: {
    sns_active: true,
    preferred_platforms: ["Instagram", "TikTok"],
    photo_spots_important: true
  }
}
```

---

## 4. `schedule_templates` - 일정 템플릿

```javascript
{
  _id: ObjectId,

  // 템플릿 정보
  template_name: "MZ 2인 3박4일 맛집투어",

  // 적용 조건
  conditions: {
    days: 4,
    travelers_min: 1,
    travelers_max: 4,
    age_groups: ["20s", "30s"],
    purpose: "food_tour",
    has_senior: false  // 60대 이상 포함 여부
  },

  // 일정
  schedule: [
    {
      day: 1,
      theme: "시먼딩 + 용산사",
      arrival_adjusted: true,  // 입국 시간에 따라 조정
      activities: [
        {
          time_slot: "afternoon",
          place_id: "longshan_temple",
          duration: 60,
          note: "오후 입국 기준"
        },
        {
          time_slot: "dinner",
          place_id: "ay_chung_noodle",
          duration: 45
        },
        {
          time_slot: "night",
          place_id: "ximending",
          duration: 120,
          note: "자유 쇼핑/야식"
        }
      ]
    },
    {
      day: 2,
      theme: "베이터우 온천 + 스린야시장",
      activities: [
        {
          time_slot: "morning",
          place_id: "beitou_hot_spring",
          duration: 180
        },
        {
          time_slot: "lunch",
          place_id: "beitou_local",
          duration: 60
        },
        {
          time_slot: "afternoon",
          place_id: "tamsui",
          duration: 120
        },
        {
          time_slot: "night",
          place_id: "shilin_night_market",
          duration: 150
        }
      ]
    }
    // ... day 3, 4
  ],

  // 메타
  usage_count: 156,
  avg_rating: 4.5,
  created_at: ISODate("2024-01-01"),
  created_by: "admin"
}
```

---

## 5. `schedule_route_combinations` - 동선 조합

```javascript
{
  _id: ObjectId,

  // 조합 정보
  combination_name: "신이구 반나절 코스",

  // 포함 장소
  places: [
    { order: 1, place_id: "dintaifung_xinyi", duration: 60 },
    { order: 2, place_id: "taipei101", duration: 90 },
    { order: 3, place_id: "xinyi_shopping", duration: 120 }
  ],

  // 총 소요 시간
  total_duration: 300,  // 분
  total_walking: 15,    // 분

  // 적합한 시간대
  best_start_time: "11:00",

  // 적합 연령대
  suitable_ages: ["20s", "30s", "40s"],

  // 난이도
  walking_level: "easy",  // easy | medium | hard

  // 비용
  estimated_cost: {
    meals: 800,
    activities: 600,
    shopping: 0,
    transport: 50
  }
}
```

---

## 6. `schedule_special_tips` - 특별 팁/주의사항

```javascript
{
  _id: ObjectId,

  category: "mobility",  // mobility | food | weather | culture | safety

  // 적용 대상
  applies_to: {
    age_groups: ["50s", "60s_plus"],
    conditions: ["has_wheelchair", "walking_difficulty"]
  },

  // 팁 내용
  tips: [
    {
      situation: "장거리 이동 시",
      advice: "MRT보다 택시 이용 권장 (기본요금 NT$70)",
      priority: "high"
    },
    {
      situation: "야시장 방문 시",
      advice: "스린야시장은 계단이 많아 라오허제 야시장 추천",
      priority: "high"
    },
    {
      situation: "식사 장소",
      advice: "좌석이 편안한 레스토랑 위주로 선택",
      priority: "medium"
    }
  ],

  // 추천 장소 필터
  place_filters: {
    must_have: ["elevator", "wheelchair"],
    prefer: ["parking", "comfortable_seating"],
    avoid: ["standing_only", "stairs_only"]
  }
}
```

---

## 요약: 컬렉션 목록

| 컬렉션 | 용도 | 예상 문서 수 |
|--------|------|-------------|
| `schedule_places` | 장소 상세 정보 | 200~500개 |
| `schedule_districts` | 지역/구역 정보 | 15~20개 |
| `schedule_age_preferences` | 연령대별 취향 | 12개 (6연령 x 2성별) |
| `schedule_templates` | 검증된 일정 템플릿 | 20~50개 |
| `schedule_route_combinations` | 동선 조합 | 50~100개 |
| `schedule_special_tips` | 특별 주의사항 | 20~30개 |

---

## 데이터 구축 우선순위

1. **1단계 (필수)**: `schedule_places` - 기존 맛집 데이터에 연령적합도 추가
2. **2단계 (권장)**: `schedule_districts` - 주요 지역 15개
3. **3단계 (권장)**: `schedule_age_preferences` - 연령대별 취향 12개
4. **4단계 (선택)**: `schedule_templates` - 인기 일정 패턴
5. **5단계 (선택)**: 나머지
