import { NextRequest, NextResponse } from "next/server";
import { getAllRestaurants, getPlaces } from "@/data/taiwan-food";
import { connectToDatabase } from "@/lib/mongodb";
import {
  ScheduleGenerateRequest,
  DaySchedule,
  PreferenceType,
  PurposeType,
  AgeGenderCount,
  FlightTimeType,
  AccommodationInfo,
  TIME_SLOT_KO,
  AGE_GROUP_PREFERENCES,
  TAIPEI_DISTRICT_OPTIONS,
} from "@/lib/schedule-types";

// 입출국 시간대 텍스트 변환
const FLIGHT_TIME_TEXT: Record<string, Record<FlightTimeType, string>> = {
  ko: {
    early_morning: "이른 아침 (06:00~09:00)",
    morning: "오전 (09:00~12:00)",
    afternoon: "오후 (12:00~17:00)",
    evening: "저녁 (17:00~21:00)",
    night: "밤/심야 (21:00~06:00)",
  },
  en: {
    early_morning: "Early morning (06:00~09:00)",
    morning: "Morning (09:00~12:00)",
    afternoon: "Afternoon (12:00~17:00)",
    evening: "Evening (17:00~21:00)",
    night: "Night/Late night (21:00~06:00)",
  },
};

// 입국 시간대에 따른 첫날 시작 시간대
const ARRIVAL_START_SLOT: Record<string, Record<FlightTimeType, string>> = {
  ko: {
    early_morning: "오전부터 일정 가능 (공항에서 시내까지 이동 시간 고려)",
    morning: "점심부터 일정 가능",
    afternoon: "저녁부터 일정 가능",
    evening: "밤 일정만 가능 (야시장 추천)",
    night: "첫날은 숙소에서 휴식, 다음날부터 일정 시작",
  },
  en: {
    early_morning: "Schedule available from morning (considering airport to city travel time)",
    morning: "Schedule available from lunch",
    afternoon: "Schedule available from evening",
    evening: "Only night schedule available (night market recommended)",
    night: "Rest at hotel on first day, start schedule from next day",
  },
};

// 출국 시간대에 따른 마지막날 일정
const DEPARTURE_END_SLOT: Record<string, Record<FlightTimeType, string>> = {
  ko: {
    early_morning: "마지막날은 전날 밤까지 일정, 당일은 공항 이동만",
    morning: "마지막날 오전 공항 이동 필요, 전날 밤까지 일정 가능",
    afternoon: "마지막날 오전까지 가벼운 일정 가능",
    evening: "마지막날 오후까지 일정 가능",
    night: "마지막날 저녁까지 일정 가능",
  },
  en: {
    early_morning: "Last day: schedule until previous night only, day of departure is airport transfer only",
    morning: "Last day: need to head to airport in the morning, schedule possible until previous night",
    afternoon: "Last day: light schedule possible until morning",
    evening: "Last day: schedule possible until afternoon",
    night: "Last day: schedule possible until evening",
  },
};

// 장소 사진 캐시 조회/저장
interface PlacePhotoCache {
  placeName: string;
  photos: string[];
  placeId?: string;
  cachedAt: Date;
}

// 장소 사진 가져오기 (캐싱 적용, 최대 10장)
async function fetchPlacePhotos(placeName: string): Promise<string[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    // 1. 캐시에서 먼저 조회
    const db = await connectToDatabase();
    const cacheCollection = db.collection<PlacePhotoCache>("place_photos_cache");

    const cached = await cacheCollection.findOne({ placeName });
    if (cached && cached.photos.length > 0) {
      // 캐시 히트 - API 호출 없이 반환
      return cached.photos;
    }

    // 2. 캐시 미스 - Google API 호출
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      placeName + " Taiwan Taipei"
    )}&language=ko&key=${apiKey}`;

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== "OK" || !searchData.results?.length) {
      return [];
    }

    const placeId = searchData.results[0].place_id;

    // Place Details로 사진 정보 가져오기
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&language=ko&key=${apiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== "OK" || !detailsData.result?.photos) {
      return [];
    }

    // 최대 10장의 사진 URL 생성
    const photoUrls: string[] = [];
    for (const photo of detailsData.result.photos.slice(0, 10)) {
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`;
      photoUrls.push(photoUrl);
    }

    // 3. 캐시에 저장 (upsert)
    await cacheCollection.updateOne(
      { placeName },
      {
        $set: {
          placeName,
          photos: photoUrls,
          placeId,
          cachedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return photoUrls;
  } catch (error) {
    console.error(`Failed to fetch photos for ${placeName}:`, error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      days,
      travelers,
      preferences,
      purposes,
      ageGenderBreakdown,
      arrivalTime = "morning",
      departureTime = "afternoon",
      accommodation,
      language = "ko",
    } = body as ScheduleGenerateRequest & { language?: string };
    const isEn = language === "en";

    // 유효성 검사
    if (!days || days < 1 || days > 14) {
      return NextResponse.json({ success: false, error: "여행 일수는 1~14일이어야 합니다." });
    }

    if (!preferences || preferences.length === 0) {
      return NextResponse.json({ success: false, error: "취향을 1개 이상 선택해주세요." });
    }

    // 맛집 데이터 가져오기
    const allRestaurants = getAllRestaurants();
    const places = getPlaces();

    // 평점 높은 음식점 추출 (상위 40개)
    const topRestaurants = allRestaurants
      .filter((r) => r.평점 && r.평점 >= 4.0)
      .sort((a, b) => (b.평점 || 0) - (a.평점 || 0))
      .slice(0, 40);

    // 연령대 라벨 맵
    const AGE_LABELS: Record<string, Record<string, string>> = {
      ko: { "10s": "10대", "20s": "20대", "30s": "30대", "40s": "40대", "50s": "50대", "60s_plus": "60대 이상" },
      en: { "10s": "Teens", "20s": "20s", "30s": "30s", "40s": "40s", "50s": "50s", "60s_plus": "60s+" },
    };

    // 연령대별 인원 텍스트 생성
    const ageBreakdownText = ageGenderBreakdown && ageGenderBreakdown.length > 0
      ? ageGenderBreakdown.map((group: AgeGenderCount) => {
          const ageLabel = AGE_LABELS[isEn ? "en" : "ko"][group.ageGroup];
          const parts = [];
          if (group.male > 0) parts.push(isEn ? `Male ${group.male}` : `남 ${group.male}명`);
          if (group.female > 0) parts.push(isEn ? `Female ${group.female}` : `여 ${group.female}명`);
          return `${ageLabel}: ${parts.join(", ")}`;
        }).join("\n  ")
      : (isEn ? `${travelers} people` : `${travelers}명`);

    // 연령대별 취향 분석 (영문)
    const AGE_GROUP_PREFERENCES_EN: Record<string, { food: string; shopping: string; activity: string; mobility: string }> = {
      "10s": { food: "Night market street food, bubble tea, trendy desserts, SNS hotspots", shopping: "Character goods, stickers, stationery, trendy accessories", activity: "Photo zones, hands-on experiences, trendy spots", mobility: "Active, comfortable walking long distances" },
      "20s": { food: "Night market street food (chicken cutlet, noodles), bubble tea, aesthetic cafe desserts", shopping: "Street fashion, sneakers, character goods, cafe accessories", activity: "Instagram-worthy spots, affordable diverse food, experiential spending", mobility: "Active, comfortable walking, prefer public transit" },
      "30s": { food: "Xiao long bao, beef noodle soup, local restaurants, atmospheric dining", shopping: "Design goods, tea/coffee supplies, quality souvenirs", activity: "Food exploration, cultural experiences, moderate shopping", mobility: "Mix of public transit + taxi, moderate walking" },
      "40s": { food: "Beef noodle soup, xiao long bao, lu rou fan, traditional tea", shopping: "Tea/health food, traditional snacks, brand clothing", activity: "Rich flavored cuisine, famous restaurants, value quality & health", mobility: "Prefer taxi/bus, gets tired from long walks" },
      "50s": { food: "Beef noodle soup, xiao long bao, lu rou fan, traditional tea, healthy food", shopping: "Tea/health food, traditional snacks, family gift items", activity: "Famous tourist spots, relaxed schedule, practical spending", mobility: "Prefer taxi/tour bus, difficulty with long walks" },
      "60s_plus": { food: "Congee, noodle soups, traditional tea houses, easy-to-digest food", shopping: "Souvenirs, traditional crafts, dried fruits/tea", activity: "Comfortable dining, traditional cultural experiences", mobility: "Taxi/tour bus essential, need plenty of rest time" },
    };

    const agePreferencesText = ageGenderBreakdown && ageGenderBreakdown.length > 0
      ? ageGenderBreakdown.map((group: AgeGenderCount) => {
          const prefs = isEn ? AGE_GROUP_PREFERENCES_EN[group.ageGroup] : AGE_GROUP_PREFERENCES[group.ageGroup];
          const total = group.male + group.female;
          if (total === 0) return "";
          const ageLabel = AGE_LABELS[isEn ? "en" : "ko"][group.ageGroup];
          return isEn
            ? `### ${ageLabel} (${total} people)\n- Food: ${prefs.food}\n- Shopping: ${prefs.shopping}\n- Activity: ${prefs.activity}\n- Mobility: ${prefs.mobility}`
            : `### ${ageLabel} (${total}명)\n- 음식: ${prefs.food}\n- 쇼핑: ${prefs.shopping}\n- 활동: ${prefs.activity}\n- 이동: ${prefs.mobility}`;
        }).filter(Boolean).join("\n\n")
      : "";

    // 취향 텍스트
    const prefText = preferences
      .map((p: PreferenceType) => {
        const map: Record<string, Record<PreferenceType, string>> = {
          ko: { food: "맛집", cafe: "카페", shopping: "쇼핑", culture: "문화", nightview: "야경", nature: "자연" },
          en: { food: "Food", cafe: "Cafe", shopping: "Shopping", culture: "Culture", nightview: "Night view", nature: "Nature" },
        };
        return map[isEn ? "en" : "ko"][p];
      })
      .join(", ");

    // 여행 목적 텍스트
    const purposeMap: Record<string, Record<PurposeType, string>> = {
      ko: { healing: "힐링", sns: "SNS 감성", food_tour: "맛집 투어", shopping: "쇼핑", culture: "문화 체험" },
      en: { healing: "Healing", sns: "SNS aesthetic", food_tour: "Food tour", shopping: "Shopping", culture: "Cultural experience" },
    };
    const purposeText = (purposes || []).map((p: PurposeType) => purposeMap[isEn ? "en" : "ko"][p]).join(", ");

    // 맛집/관광지 목록
    const restaurantList = topRestaurants
      .map((r) => isEn
        ? `- ${r.name_en || r.이름} (${r.location_en || r.위치}) ⭐${r.평점} - ${r.feature_en || r.특징}`
        : `- ${r.이름} (${r.위치}) ⭐${r.평점} - ${r.특징}`)
      .join("\n");

    const placesList = places
      .slice(0, 20)
      .map((p) => isEn
        ? `- ${p.name_en || p.이름} (${p.location_en || p.위치}) - ${p.feature_en || p.특징}`
        : `- ${p.이름} (${p.위치}) - ${p.특징}`)
      .join("\n");

    // 여행자 구성 분석 (프롬프트 동적 생성용)
    const activeGroups = ageGenderBreakdown?.filter((g: AgeGenderCount) => g.male + g.female > 0) || [];
    const hasMultipleAgeGroups = activeGroups.length > 1;
    const hasSenior = activeGroups.some((g: AgeGenderCount) => ["50s", "60s_plus"].includes(g.ageGroup));
    const hasMiddleAge = activeGroups.some((g: AgeGenderCount) => ["40s", "50s"].includes(g.ageGroup));
    const hasYoung = activeGroups.some((g: AgeGenderCount) => ["10s", "20s"].includes(g.ageGroup));
    const isSingleAgeGroup = activeGroups.length === 1;

    // 성별 분석
    const totalMale = activeGroups.reduce((sum: number, g: AgeGenderCount) => sum + g.male, 0);
    const totalFemale = activeGroups.reduce((sum: number, g: AgeGenderCount) => sum + g.female, 0);
    const genderDescription = isEn
      ? (totalMale === 0 ? "female" : totalFemale === 0 ? "male" : "mixed")
      : (totalMale === 0 ? "여성" : totalFemale === 0 ? "남성" : "혼성");

    // 대표 연령대 텍스트
    const mainAgeLabel = isSingleAgeGroup ? AGE_LABELS[isEn ? "en" : "ko"][activeGroups[0].ageGroup] : null;

    // GPT 프롬프트 구성
    const systemPrompt = isEn
      ? `You are a friendly and experienced Taipei local travel guide.
You introduce each place in a warm, natural conversational tone as if speaking directly to the travelers.
${hasMultipleAgeGroups
  ? "When creating an itinerary for a travel group with various age groups, create a balanced schedule that satisfies all age groups."
  : `Create an itinerary perfectly suited for ${travelers} ${genderDescription} traveler(s) in their ${mainAgeLabel}. Focus on the tastes and interests of this age group and gender.`}
${hasSenior ? "Since there are elderly travelers, carefully consider travel distance and rest time." : ""}
**IMPORTANT: All output must be in English.** Respond only in JSON format. Do not include any other text.`
      : `당신은 친절하고 경험 많은 타이베이 현지 여행 가이드입니다.
여행자에게 직접 말하듯 따뜻하고 자연스러운 대화체로 각 장소를 소개합니다.
${hasMultipleAgeGroups
  ? "다양한 연령대가 함께하는 여행 그룹의 일정을 만들 때, 모든 연령층이 만족할 수 있도록 균형 잡힌 일정을 구성합니다."
  : `${mainAgeLabel} ${genderDescription} ${travelers}명의 여행에 딱 맞는 일정을 구성합니다. 이 연령대와 성별의 취향과 관심사에 집중하세요.`}
${hasSenior ? "특히 고령 여행자가 있으므로 이동 거리와 휴식 시간을 충분히 고려합니다." : ""}
응답은 반드시 JSON 형식으로만 해주세요. 다른 텍스트는 포함하지 마세요.`;

    const userPrompt = isEn
    ? `Please create a ${days}-day Taipei travel itinerary.

## Traveler Information
- Total travelers: ${travelers} people
- Composition:
  ${ageBreakdownText}
- Preferences: ${prefText}
- Travel purpose: ${purposeText}

## Flight Information
- Arrival (Day 1): ${FLIGHT_TIME_TEXT.en[arrivalTime]}
  → ${ARRIVAL_START_SLOT.en[arrivalTime]}
- Departure (Day ${days}): ${FLIGHT_TIME_TEXT.en[departureTime]}
  → ${DEPARTURE_END_SLOT.en[departureTime]}

## Accommodation Information
${accommodation ? `- Hotel: ${accommodation.name || "TBD"}
- Location: ${accommodation.district || "TBD"}
- Nearby attractions: ${accommodation.districtId ? TAIPEI_DISTRICT_OPTIONS.find(d => d.id === accommodation.districtId)?.nearbyAttractions.join(", ") || "N/A" : "N/A"}
→ **Route optimization**: Place nearby areas in morning/evening schedule, visit farther areas during midday` : "- Accommodation location TBD (use general routing)"}

## Age Group Preference Analysis
${agePreferencesText || "Need to consider various age groups"}

${hasMultipleAgeGroups ? `## Important: Multi-age Group Considerations
1. **Young (Teens~30s)**: Include night markets, cafes, SNS hotspots, shopping spots
2. **Middle-aged (40s~50s)**: Famous restaurants, comfortable transport (taxi/bus), quality shopping
3. **Senior (60s+)**: Avoid long walks, comfortable dining, plenty of rest time
4. **Common**: Include attractions and restaurants everyone can enjoy` : `## Important: Traveler-Customized Principles
- This group is **${travelers} ${genderDescription} traveler(s) in their ${mainAgeLabel}**
- **Strictly focus** on the selected preferences (${prefText}) and purposes (${purposeText})
- Do not include unselected categories (e.g., if culture was not selected, skip cultural landmarks like Chiang Kai-shek Memorial Hall)
- ${hasYoung && !hasMiddleAge && !hasSenior ? "Focus on trendy places, SNS hotspots, aesthetic cafes, and night markets for young travelers" : ""}
- ${genderDescription === "female" ? "Focus on aesthetic cafes, desserts, photo spots, and shopping for female travelers" : ""}
- ${genderDescription === "male" ? "Focus on famous restaurants, night markets, and attractions for male travelers" : ""}`}

${hasSenior || hasMiddleAge ? `## Transportation Notes
${hasMiddleAge ? "- With travelers 40+: Avoid walks longer than 30 minutes between locations" : ""}
${hasSenior ? "- With travelers 50+: Recommend taxi/tour bus when possible" : ""}
${activeGroups.some((g: AgeGenderCount) => g.ageGroup === "60s_plus") ? "- With travelers 60+: Only 1-2 places per morning/afternoon, mandatory cafe rest in between" : ""}` : `## Transportation
- Freely use public transit (MRT) + walking`}

## Available Restaurant List (by rating)
${restaurantList}

## Available Attraction List
${placesList}

## Response Format (JSON)
{
  "schedule": [
    {
      "day": 1,
      "theme": "Ximending Exploration + Night Market",
      "activities": [
        {
          "id": "d1_lunch",
          "timeSlot": "lunch",
          "timeSlotKo": "Lunch",
          "type": "restaurant",
          "name": "Din Tai Fung",
          "location": "Taipei Xinyi",
          "rating": 4.7,
          "reason": "(Conversational recommendation tailored to the traveler group. e.g., for 3 women in their 20s: 'Welcome to Taipei! Your first meal has to be Din Tai Fung's xiao long bao~ You've probably seen it on Instagram, but tasting it in person is a whole different experience!')",
          "tip": "Visit before 11am to avoid waiting"
        },
        {
          "id": "d1_afternoon",
          "timeSlot": "afternoon",
          "timeSlotKo": "Afternoon",
          "type": "cafe",
          "name": "Cafe Name",
          "location": "Location",
          "reason": "(Conversational recommendation tailored to travelers. e.g., for young women: 'Now that you're full, it's cafe time! This place has the most amazing photo spots - perfect for your Instagram~')",
          "tip": "Air-conditioned, comfortable seating",
          "travelFromPrev": {
            "method": "Walk",
            "duration": "About 10 min",
            "description": "It's about a 10-minute walk from Din Tai Fung. Enjoy the street views as you stroll along!"
          }
        }
      ]
    }
  ],
  "tips": [
    "(3~5 practical tips tailored to the traveler group)"
  ],
  "budget": "About NT$3,000~5,000/day per person (excluding accommodation)"
}

## Important Rules
1. Restaurants must be selected from the restaurant list above (exact names)
2. Attractions from the list above or well-known landmarks
3. **Adjust Day 1 schedule based on arrival time** (late arrival = fewer activities)
4. **Adjust last day schedule based on departure time** (early departure = fewer activities)
5. Arrange nearby places together for efficient routing
6. Different theme for each day
${activeGroups.some((g: AgeGenderCount) => g.ageGroup === "60s_plus") ? "7. Include rest points in every day's schedule for 60+ travelers" : "7. Match energy levels to the travelers' age/gender"}
8. Output only JSON. Return only the JSON object without any explanation
9. **Rules for the 'reason' field (VERY IMPORTANT)**:
   - Write in a **friendly conversational tone** as if speaking directly to the travelers
   - Consider the current travel context (e.g., first-day fatigue, post-meal rest, evening night market atmosphere)
   - Explain specifically why this place is recommended at this time
   - **Write comments suited to the actual traveler composition (${mainAgeLabel || "various ages"} ${genderDescription} ${travelers} people)**
   - ${hasMultipleAgeGroups ? "Include considerate comments for different age groups traveling together" : "Highlight points that this age group/gender would actually enjoy"}
   - Connect naturally with the previous schedule (e.g., "Now that you've had a great meal...", "After your morning walk...")
   - Write 2~3 sentences (not too short, not too long)
   - **ALL text must be in English**
10. **travelFromPrev field (travel information)**:
   - Include travelFromPrev for all activities **except the first activity** of each day
   - method: "Walk", "MRT", "Bus", "Taxi", "MRT+Walk" etc. - actual transportation
   - duration: "About 5 min", "About 15 min", "About 30 min" etc. - actual estimated time
   - description: Friendly conversational travel guide in English
   ${hasSenior || hasMiddleAge ? "- For elderly/middle-aged companions, include considerate mentions like recommending taxis" : "- Match travel guidance to traveler age (for young groups, present walks as enjoyable experiences)"}
   - Use accurate travel times reflecting actual Taipei geography`
    : `타이베이 ${days}일 여행 일정을 만들어주세요.

## 여행자 정보
- 총 인원: ${travelers}명
- 구성:
  ${ageBreakdownText}
- 선호 취향: ${prefText}
- 여행 목적: ${purposeText}

## 항공편 정보
- 입국 (Day 1): ${FLIGHT_TIME_TEXT.ko[arrivalTime]}
  → ${ARRIVAL_START_SLOT.ko[arrivalTime]}
- 출국 (Day ${days}): ${FLIGHT_TIME_TEXT.ko[departureTime]}
  → ${DEPARTURE_END_SLOT.ko[departureTime]}

## 숙소 정보
${accommodation ? `- 숙소: ${accommodation.name || "미정"}
- 위치: ${accommodation.district || "미정"}
- 인근 명소: ${accommodation.districtId ? TAIPEI_DISTRICT_OPTIONS.find(d => d.id === accommodation.districtId)?.nearbyAttractions.join(", ") || "정보 없음" : "정보 없음"}
→ **동선 최적화**: 숙소 인근 지역을 아침/저녁 일정에 배치하고, 먼 지역은 한낮에 방문` : "- 숙소 위치 미정 (일반적인 동선으로 구성)"}

## 연령대별 취향 분석
${agePreferencesText || "다양한 연령대 고려 필요"}

${hasMultipleAgeGroups ? `## 중요: 다양한 연령대 배려 원칙
1. **젊은 층 (10~30대)**: 야시장, 카페, SNS 핫플, 쇼핑 스팟 포함
2. **중장년층 (40~50대)**: 유명 맛집, 편안한 이동(택시/버스), 품질 좋은 쇼핑
3. **시니어 (60대+)**: 장시간 도보 피하기, 편안한 식당, 충분한 휴식 시간
4. **공통**: 모두가 즐길 수 있는 관광 명소, 맛집 포함` : `## 중요: 여행자 맞춤 원칙
- 이 그룹은 **${mainAgeLabel} ${genderDescription} ${travelers}명**입니다
- 사용자가 선택한 취향(${prefText})과 목적(${purposeText})에 **철저히 집중**하세요
- 선택하지 않은 카테고리(예: 문화를 선택 안 했으면 중정기념당 같은 문화 관광지)는 포함하지 마세요
- ${hasYoung && !hasMiddleAge && !hasSenior ? "젊은 감성에 맞는 트렌디한 장소, SNS 핫플, 감성 카페, 야시장 위주로 구성하세요" : ""}
- ${genderDescription === "여성" ? "여성 여행자 취향에 맞는 감성 카페, 디저트, 포토스팟, 쇼핑 위주로 구성하세요" : ""}
- ${genderDescription === "남성" ? "남성 여행자 취향에 맞는 맛집, 야시장, 관광 명소 위주로 구성하세요" : ""}`}

${hasSenior || hasMiddleAge ? `## 이동 관련 주의사항
${hasMiddleAge ? "- 40대 이상이 있으므로: 한 장소에서 30분 이상 걷는 일정 피하기" : ""}
${hasSenior ? "- 50대 이상이 있으므로: 가능하면 택시/관광버스 이용 권장" : ""}
${activeGroups.some((g: AgeGenderCount) => g.ageGroup === "60s_plus") ? "- 60대 이상이 있으므로: 오전/오후 각 1-2개 장소만, 중간에 카페 휴식 필수" : ""}` : `## 이동 관련
- 대중교통(MRT) + 도보 중심으로 자유롭게 구성`}

## 추천 가능한 맛집 목록 (평점 순)
${restaurantList}

## 추천 가능한 관광지 목록
${placesList}

## 응답 형식 (JSON)
{
  "schedule": [
    {
      "day": 1,
      "theme": "시먼딩 탐방 + 야시장",
      "activities": [
        {
          "id": "d1_lunch",
          "timeSlot": "lunch",
          "timeSlotKo": "점심",
          "type": "restaurant",
          "name": "딩타이펑",
          "location": "타이베이 신이",
          "rating": 4.7,
          "reason": "(여행자 구성에 맞는 대화체 추천 이유. 예: 20대 여성 3명이면 '타이베이 도착하셨군요! 첫 끼는 역시 딩타이펑 샤오롱바오죠~ 인스타에서 많이 보셨을 텐데, 직접 먹으면 감동이에요!', 10대+40대 가족이면 '비행기 타고 오시느라 고생하셨죠? 온 가족이 좋아하는 딩타이펑으로 시작해볼까요?')",
          "tip": "11시 전 방문 시 대기 없음"
        },
        {
          "id": "d1_afternoon",
          "timeSlot": "afternoon",
          "timeSlotKo": "오후",
          "type": "cafe",
          "name": "카페이름",
          "location": "위치",
          "reason": "(여행자 구성에 맞는 대화체. 예: 20대 여성이면 '배 채웠으니 이제 감성 카페 타임이죠! 여기 포토존이 진짜 예뻐서 인스타 각이에요~', 중장년이면 '식사 후 잠시 쉬어가세요. 조용하고 편안한 분위기의 카페랍니다.')",
          "tip": "에어컨 완비, 편안한 좌석",
          "travelFromPrev": {
            "method": "도보",
            "duration": "약 10분",
            "description": "딩타이펑에서 걸어서 10분 정도면 도착해요. 거리 구경하면서 산책삼아 가볍게 걸어보세요!"
          }
        }
      ]
    }
  ],
  "tips": [
    "(여행자 구성에 맞는 실용 팁 3~5개. 연령/성별에 맞게 작성)"
  ],
  "budget": "1인당 약 NT$3,000~5,000/일 (숙박 제외)"
}

## 중요 규칙
1. 음식점은 반드시 위 맛집 목록에서 선택 (이름 정확히)
2. 관광지는 위 목록 또는 유명 명소에서 선택
3. **입국 시간대에 따라 Day 1 일정 조정** (늦은 입국이면 일정 축소)
4. **출국 시간대에 따라 마지막 날 일정 조정** (이른 출국이면 일정 축소)
5. 동선을 고려해 가까운 장소끼리 배치
6. 각 일차별로 테마를 다르게 구성
${activeGroups.some((g: AgeGenderCount) => g.ageGroup === "60s_plus") ? "7. 60대 이상이 있으므로 매 일정에 휴식 포인트 포함" : "7. 여행자 연령/성별에 맞는 에너지 레벨로 일정 구성"}
8. JSON만 출력. 다른 설명 없이 JSON 객체만 반환
9. **reason 필드 작성 규칙 (매우 중요)**:
   - 반드시 여행자에게 직접 말하는 **친근한 대화체**로 작성 (~세요, ~요, ~죠?, ~어떨까요?)
   - 현재 여행 상황과 맥락을 고려 (예: 첫날 도착 피로, 식사 후 휴식, 저녁 야시장 분위기 등)
   - 왜 이 장소를 이 시간에 추천하는지 구체적 이유 설명
   - **실제 여행자 구성(${mainAgeLabel || "다양한 연령대"} ${genderDescription} ${travelers}명)에 맞는 멘트 작성** (예: 20대 여성이면 "인스타 감성", 40대 혼성이면 "온 가족이" 등)
   - ${hasMultipleAgeGroups ? "동행하는 다른 연령대를 배려하는 멘트 포함" : "이 연령대/성별이 실제로 좋아할 만한 포인트를 강조"}
   - 이전 일정과 자연스럽게 연결 (예: "맛있게 드셨으면 이제...", "아침 산책 후...")
   - 2~3문장으로 작성 (너무 짧지도, 너무 길지도 않게)
10. **travelFromPrev 필드 (이동 정보)**:
   - 각 일차의 **첫 번째 활동을 제외한** 모든 활동에 travelFromPrev를 포함
   - method: "도보", "MRT", "버스", "택시", "MRT+도보" 등 실제 이동 수단
   - duration: "약 5분", "약 15분", "약 30분" 등 실제 예상 소요 시간
   - description: 친근한 대화체로 이동 안내 (예: "걸어서 10분이면 도착해요. 산책삼아 가볍게 걸어보세요!")
   ${hasSenior || hasMiddleAge ? "- 고령자/중장년 동행 시 택시 권장 등 배려 멘트 포함" : "- 여행자 연령에 맞는 이동 안내 (젊은 그룹이면 도보 산책도 즐거운 경험으로 소개)"}
   - 타이베이 실제 지리를 반영한 정확한 이동 시간`;

    // OpenAI API 호출
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ success: false, error: "OpenAI API 키가 설정되지 않았습니다." });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("OpenAI API error:", errorData);
      return NextResponse.json({ success: false, error: "AI 서비스 오류가 발생했습니다." });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ success: false, error: "AI 응답이 비어있습니다." });
    }

    // JSON 파싱
    let parsedSchedule;
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        jsonStr = content.trim();
      }
      parsedSchedule = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return NextResponse.json({ success: false, error: "AI 응답 형식 오류입니다." });
    }

    // 응답 데이터 검증 및 보강
    const schedule: DaySchedule[] = parsedSchedule.schedule || [];

    for (const day of schedule) {
      for (const activity of day.activities) {
        if (!activity.timeSlotKo && activity.timeSlot) {
          activity.timeSlotKo = TIME_SLOT_KO[activity.timeSlot as keyof typeof TIME_SLOT_KO] || activity.timeSlot;
        }
        if (activity.type === "restaurant" && !activity.rating) {
          const matchingRestaurant = allRestaurants.find(
            (r) => r.이름 === activity.name || r.이름.includes(activity.name)
          );
          if (matchingRestaurant) {
            activity.rating = matchingRestaurant.평점;
            activity.location = activity.location || matchingRestaurant.위치;
          }
        }
      }
    }

    // 각 장소의 사진 가져오기 (병렬 처리)
    const photoPromises: Promise<void>[] = [];
    for (const day of schedule) {
      for (const activity of day.activities) {
        photoPromises.push(
          fetchPlacePhotos(activity.name).then((photos) => {
            activity.photos = photos;
          })
        );
      }
    }
    await Promise.all(photoPromises);

    return NextResponse.json({
      success: true,
      data: {
        schedule,
        tips: parsedSchedule.tips || [],
        budget: parsedSchedule.budget || "1인당 약 NT$3,000~5,000/일",
      },
    });
  } catch (error) {
    console.error("Schedule generation error:", error);
    return NextResponse.json({
      success: false,
      error: "일정 생성 중 오류가 발생했습니다.",
    });
  }
}
