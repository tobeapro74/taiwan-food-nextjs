import { NextRequest, NextResponse } from "next/server";
import { getAllRestaurants, getPlaces } from "@/data/taiwan-food";
import {
  ScheduleGenerateRequest,
  DaySchedule,
  PreferenceType,
  TIME_SLOT_KO,
} from "@/lib/schedule-types";

export async function POST(request: NextRequest) {
  try {
    const body: ScheduleGenerateRequest = await request.json();
    const { days, travelers, gender, ageGroup, preferences, purpose } = body;

    // 유효성 검사
    if (!days || days < 1 || days > 7) {
      return NextResponse.json({ success: false, error: "여행 일수는 1~7일이어야 합니다." });
    }

    if (!preferences || preferences.length === 0) {
      return NextResponse.json({ success: false, error: "취향을 1개 이상 선택해주세요." });
    }

    // 맛집 데이터 가져오기
    const allRestaurants = getAllRestaurants();
    const places = getPlaces();

    // 평점 높은 음식점 추출 (상위 30개)
    const topRestaurants = allRestaurants
      .filter((r) => r.평점 && r.평점 >= 4.0)
      .sort((a, b) => (b.평점 || 0) - (a.평점 || 0))
      .slice(0, 30);

    // GPT 프롬프트 구성
    const systemPrompt = `당신은 타이베이 MZ세대 여행 전문가입니다.
한국인 MZ세대의 취향을 잘 알고 있으며, 로컬 맛집과 핫플레이스를 추천합니다.
응답은 반드시 JSON 형식으로만 해주세요. 다른 텍스트는 포함하지 마세요.`;

    const genderText = gender === "mixed" ? "혼성" : gender === "male" ? "남성" : "여성";
    const ageText = ageGroup === "20s" ? "20대" : ageGroup === "30s" ? "30대" : "40대 이상";
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

    const purposeText = {
      healing: "힐링",
      sns: "SNS 감성",
      food_tour: "맛집 투어",
      shopping: "쇼핑",
      culture: "문화 체험",
    }[purpose];

    const restaurantList = topRestaurants
      .map((r) => `- ${r.이름} (${r.위치}) ⭐${r.평점} - ${r.특징}`)
      .join("\n");

    const placesList = places
      .slice(0, 15)
      .map((p) => `- ${p.이름} (${p.위치}) - ${p.특징}`)
      .join("\n");

    const userPrompt = `타이베이 ${days}일 여행 일정을 만들어주세요.

## 여행자 정보
- 인원: ${travelers}명
- 성별: ${genderText}
- 연령대: ${ageText}
- 취향: ${prefText}
- 여행 목적: ${purposeText}

## 추천 가능한 맛집 목록 (평점 순)
${restaurantList}

## 추천 가능한 관광지 목록
${placesList}

## 응답 형식 (JSON)
{
  "schedule": [
    {
      "day": 1,
      "theme": "로컬 감성 + 먹거리 + 쇼핑",
      "activities": [
        {
          "id": "d1_morning",
          "timeSlot": "morning",
          "timeSlotKo": "오전",
          "type": "attraction",
          "name": "용산사",
          "location": "타이베이시 만화구",
          "reason": "현지인들의 기도 문화 체험, 화려한 중국식 사원",
          "tip": "향과 소원 종이는 무료 제공"
        },
        {
          "id": "d1_lunch",
          "timeSlot": "lunch",
          "timeSlotKo": "점심",
          "type": "restaurant",
          "name": "딩타이펑",
          "location": "타이베이 신이",
          "rating": 4.7,
          "reason": "세계적으로 유명한 샤오롱바오",
          "tip": "11시 전 방문 시 대기 없음"
        },
        {
          "id": "d1_afternoon",
          "timeSlot": "afternoon",
          "timeSlotKo": "오후",
          "type": "cafe",
          "name": "카페이름",
          "location": "위치",
          "reason": "추천 이유",
          "shoppingItems": ["예쁜 양산", "로컬 소품"]
        },
        {
          "id": "d1_dinner",
          "timeSlot": "dinner",
          "timeSlotKo": "저녁",
          "type": "restaurant",
          "name": "야시장이름",
          "location": "위치",
          "rating": 4.4,
          "reason": "추천 이유"
        },
        {
          "id": "d1_night",
          "timeSlot": "night",
          "timeSlotKo": "밤",
          "type": "shopping",
          "name": "시먼딩",
          "location": "타이베이 시먼딩",
          "reason": "스트리트 패션, K-POP 굿즈",
          "shoppingItems": ["스트리트 패션", "한정판 스니커즈"]
        }
      ]
    }
  ],
  "tips": [
    "야시장은 18:00 이후 방문하세요",
    "현금을 충분히 준비하세요",
    "MRT 이지카드 필수"
  ],
  "budget": "1인당 약 NT$3,000~5,000/일 (숙박 제외)"
}

## 중요 규칙
1. 음식점은 반드시 위 맛집 목록에서 선택하세요 (이름을 정확히 사용)
2. 관광지는 위 관광지 목록 또는 유명 명소(용산사, 중정기념당, 타이베이101 등)에서 선택
3. 동선을 고려해 가까운 장소끼리 배치하세요
4. MZ세대 감성에 맞는 카페, 포토존, 쇼핑 스팟을 포함하세요
5. 야시장은 저녁/밤 시간에 배치하세요
6. 각 일차별로 테마를 다르게 구성하세요
7. shoppingItems는 해당 장소에서 살 수 있는 아이템을 배열로 제공하세요
8. JSON만 출력하세요. 다른 설명 없이 JSON 객체만 반환하세요.`;

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
        max_tokens: 4000,
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
      // JSON 블록 추출 (```json ... ``` 형태 처리)
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // ```가 없는 경우 전체를 JSON으로 시도
        jsonStr = content.trim();
      }
      parsedSchedule = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", content);
      return NextResponse.json({ success: false, error: "AI 응답 형식 오류입니다." });
    }

    // 응답 데이터 검증 및 보강
    const schedule: DaySchedule[] = parsedSchedule.schedule || [];

    // 각 활동에 timeSlotKo가 없으면 추가
    for (const day of schedule) {
      for (const activity of day.activities) {
        if (!activity.timeSlotKo && activity.timeSlot) {
          activity.timeSlotKo = TIME_SLOT_KO[activity.timeSlot as keyof typeof TIME_SLOT_KO] || activity.timeSlot;
        }
        // 음식점 데이터 보강 (평점 등)
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
