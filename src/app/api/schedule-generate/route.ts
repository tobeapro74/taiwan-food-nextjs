import { NextRequest, NextResponse } from "next/server";
import { getAllRestaurants, getPlaces } from "@/data/taiwan-food";
import { connectToDatabase } from "@/lib/mongodb";
import {
  ScheduleGenerateRequest,
  DaySchedule,
  PreferenceType,
  AgeGenderCount,
  FlightTimeType,
  AccommodationInfo,
  TIME_SLOT_KO,
  AGE_GROUP_PREFERENCES,
  TAIPEI_DISTRICT_OPTIONS,
} from "@/lib/schedule-types";

// 입출국 시간대 텍스트 변환
const FLIGHT_TIME_TEXT: Record<FlightTimeType, string> = {
  early_morning: "이른 아침 (06:00~09:00)",
  morning: "오전 (09:00~12:00)",
  afternoon: "오후 (12:00~17:00)",
  evening: "저녁 (17:00~21:00)",
  night: "밤/심야 (21:00~06:00)",
};

// 입국 시간대에 따른 첫날 시작 시간대
const ARRIVAL_START_SLOT: Record<FlightTimeType, string> = {
  early_morning: "오전부터 일정 가능 (공항에서 시내까지 이동 시간 고려)",
  morning: "점심부터 일정 가능",
  afternoon: "저녁부터 일정 가능",
  evening: "밤 일정만 가능 (야시장 추천)",
  night: "첫날은 숙소에서 휴식, 다음날부터 일정 시작",
};

// 출국 시간대에 따른 마지막날 일정
const DEPARTURE_END_SLOT: Record<FlightTimeType, string> = {
  early_morning: "마지막날은 전날 밤까지 일정, 당일은 공항 이동만",
  morning: "마지막날 오전 공항 이동 필요, 전날 밤까지 일정 가능",
  afternoon: "마지막날 오전까지 가벼운 일정 가능",
  evening: "마지막날 오후까지 일정 가능",
  night: "마지막날 저녁까지 일정 가능",
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
    const body: ScheduleGenerateRequest = await request.json();
    const {
      days,
      travelers,
      preferences,
      purpose,
      ageGenderBreakdown,
      arrivalTime = "morning",
      departureTime = "afternoon",
      accommodation
    } = body;

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

    // 연령대별 인원 텍스트 생성
    const ageBreakdownText = ageGenderBreakdown && ageGenderBreakdown.length > 0
      ? ageGenderBreakdown.map((group: AgeGenderCount) => {
          const ageLabel = {
            "10s": "10대",
            "20s": "20대",
            "30s": "30대",
            "40s": "40대",
            "50s": "50대",
            "60s_plus": "60대 이상"
          }[group.ageGroup];
          const parts = [];
          if (group.male > 0) parts.push(`남 ${group.male}명`);
          if (group.female > 0) parts.push(`여 ${group.female}명`);
          return `${ageLabel}: ${parts.join(", ")}`;
        }).join("\n  ")
      : `${travelers}명`;

    // 연령대별 취향 분석
    const agePreferencesText = ageGenderBreakdown && ageGenderBreakdown.length > 0
      ? ageGenderBreakdown.map((group: AgeGenderCount) => {
          const prefs = AGE_GROUP_PREFERENCES[group.ageGroup];
          const total = group.male + group.female;
          if (total === 0) return "";
          const ageLabel = {
            "10s": "10대",
            "20s": "20대",
            "30s": "30대",
            "40s": "40대",
            "50s": "50대",
            "60s_plus": "60대 이상"
          }[group.ageGroup];
          return `### ${ageLabel} (${total}명)
- 음식: ${prefs.food}
- 쇼핑: ${prefs.shopping}
- 활동: ${prefs.activity}
- 이동: ${prefs.mobility}`;
        }).filter(Boolean).join("\n\n")
      : "";

    // 취향 텍스트
    const prefText = preferences
      .map((p: PreferenceType) => {
        const map: Record<PreferenceType, string> = {
          food: "맛집",
          cafe: "카페",
          shopping: "쇼핑",
          culture: "문화",
          nightview: "야경",
          nature: "자연",
        };
        return map[p];
      })
      .join(", ");

    // 여행 목적 텍스트
    const purposeText = {
      healing: "힐링",
      sns: "SNS 감성",
      food_tour: "맛집 투어",
      shopping: "쇼핑",
      culture: "문화 체험",
    }[purpose];

    // 맛집/관광지 목록
    const restaurantList = topRestaurants
      .map((r) => `- ${r.이름} (${r.위치}) ⭐${r.평점} - ${r.특징}`)
      .join("\n");

    const placesList = places
      .slice(0, 20)
      .map((p) => `- ${p.이름} (${p.위치}) - ${p.특징}`)
      .join("\n");

    // GPT 프롬프트 구성
    const systemPrompt = `당신은 타이베이 여행 전문가입니다.
다양한 연령대가 함께하는 여행 그룹의 일정을 만들 때, 모든 연령층이 만족할 수 있도록 균형 잡힌 일정을 구성합니다.
특히 고령 여행자가 있을 경우 이동 거리와 휴식 시간을 충분히 고려합니다.
응답은 반드시 JSON 형식으로만 해주세요. 다른 텍스트는 포함하지 마세요.`;

    const userPrompt = `타이베이 ${days}일 여행 일정을 만들어주세요.

## 여행자 정보
- 총 인원: ${travelers}명
- 구성:
  ${ageBreakdownText}
- 선호 취향: ${prefText}
- 여행 목적: ${purposeText}

## 항공편 정보
- 입국 (Day 1): ${FLIGHT_TIME_TEXT[arrivalTime]}
  → ${ARRIVAL_START_SLOT[arrivalTime]}
- 출국 (Day ${days}): ${FLIGHT_TIME_TEXT[departureTime]}
  → ${DEPARTURE_END_SLOT[departureTime]}

## 숙소 정보
${accommodation ? `- 숙소: ${accommodation.name || "미정"}
- 위치: ${accommodation.district || "미정"}
- 인근 명소: ${accommodation.districtId ? TAIPEI_DISTRICT_OPTIONS.find(d => d.id === accommodation.districtId)?.nearbyAttractions.join(", ") || "정보 없음" : "정보 없음"}
→ **동선 최적화**: 숙소 인근 지역을 아침/저녁 일정에 배치하고, 먼 지역은 한낮에 방문` : "- 숙소 위치 미정 (일반적인 동선으로 구성)"}

## 연령대별 취향 분석
${agePreferencesText || "다양한 연령대 고려 필요"}

## 중요: 다양한 연령대 배려 원칙
1. **젊은 층 (10~30대)**: 야시장, 카페, SNS 핫플, 쇼핑 스팟 포함
2. **중장년층 (40~50대)**: 유명 맛집, 편안한 이동(택시/버스), 품질 좋은 쇼핑
3. **시니어 (60대+)**: 장시간 도보 피하기, 편안한 식당, 충분한 휴식 시간
4. **공통**: 모두가 즐길 수 있는 관광 명소, 맛집 포함

## 이동 관련 주의사항
- 40대 이상이 있으면: 한 장소에서 30분 이상 걷는 일정 피하기
- 50대 이상이 있으면: 가능하면 택시/관광버스 이용 권장
- 60대 이상이 있으면: 오전/오후 각 1-2개 장소만, 중간에 카페 휴식 필수

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
          "reason": "모든 연령대가 좋아하는 샤오롱바오",
          "tip": "11시 전 방문 시 대기 없음",
          "forAgeGroups": ["모든 연령"]
        },
        {
          "id": "d1_afternoon",
          "timeSlot": "afternoon",
          "timeSlotKo": "오후",
          "type": "cafe",
          "name": "카페이름",
          "location": "위치",
          "reason": "중장년층 휴식 + 젊은층 포토존",
          "tip": "에어컨 완비, 편안한 좌석"
        }
      ]
    }
  ],
  "tips": [
    "40대 이상 동반 시 택시 이용을 권장합니다",
    "야시장은 젊은 분들만 따로 다녀오셔도 좋아요",
    "MRT 이지카드는 필수입니다"
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
7. 60대 이상이 있으면 매 일정에 휴식 포인트 포함
8. JSON만 출력. 다른 설명 없이 JSON 객체만 반환`;

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
