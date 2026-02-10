import { NextRequest, NextResponse } from "next/server";
import { getAllRestaurants, getRestaurantSummaryForAI, Restaurant } from "@/data/taiwan-food";
import { connectToDatabase } from "@/lib/mongodb";

interface AIRecommendRequest {
  query: string;
  timeSlot?: string;
}

interface AIRecommendation {
  name: string;
  reason: string;
  matchScore: number;
}

// MongoDB 맛집을 AI 요약 형식으로 변환
function formatCustomRestaurantForAI(r: Record<string, unknown>): string {
  const parts = [r.name as string];
  if (r.category) parts.push(`[${r.category}]`);
  if (r.address) parts.push(r.address as string);
  if (r.google_rating) parts.push(`⭐${r.google_rating}`);
  if (r.feature) parts.push((r.feature as string).substring(0, 40));
  return parts.join(" | ");
}

// MongoDB 맛집을 Restaurant 형식으로 변환
function toRestaurant(r: Record<string, unknown>): Restaurant {
  return {
    이름: r.name as string,
    위치: (r.address as string) || "",
    특징: (r.feature as string) || "",
    평점: (r.google_rating as number) || undefined,
    리뷰수: (r.google_reviews_count as number) || undefined,
    전화번호: (r.phone_number as string) || undefined,
    place_id: (r.place_id as string) || undefined,
    category: (r.category as string) || undefined,
    coordinates: r.coordinates as { lat: number; lng: number } | undefined,
    registered_by: (r.registered_by as number) || undefined,
    google_rating: (r.google_rating as number) || undefined,
    google_reviews_count: (r.google_reviews_count as number) || undefined,
    address: (r.address as string) || undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: AIRecommendRequest = await request.json();
    const { query, timeSlot } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: false, error: "추천 요청을 입력해주세요." });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ success: false, error: "AI 서비스가 설정되지 않았습니다." });
    }

    // 정적 데이터 요약
    const staticSummary = getRestaurantSummaryForAI();

    // MongoDB 사용자 등록 맛집 조회
    let customSummary = "";
    let customRestaurants: Record<string, unknown>[] = [];
    try {
      const db = await connectToDatabase();
      const collection = db.collection("custom_restaurants");
      customRestaurants = await collection
        .find({ deleted: { $ne: true } })
        .project({ name: 1, category: 1, address: 1, feature: 1, google_rating: 1, google_reviews_count: 1, phone_number: 1, place_id: 1, coordinates: 1, registered_by: 1 })
        .toArray() as Record<string, unknown>[];

      if (customRestaurants.length > 0) {
        customSummary = customRestaurants
          .map(formatCustomRestaurantForAI)
          .join("\n");
      }
    } catch (dbError) {
      console.error("MongoDB query error (non-fatal):", dbError);
      // DB 실패해도 정적 데이터만으로 계속 진행
    }

    const fullSummary = customSummary
      ? `${staticSummary}\n\n## 사용자 등록 맛집\n${customSummary}`
      : staticSummary;

    const systemPrompt = `당신은 대만 타이베이 맛집 추천 전문가입니다.
사용자의 요청에 맞는 맛집을 아래 목록에서 선택하여 추천합니다.
응답은 반드시 JSON 형식으로만 해주세요. 다른 텍스트는 포함하지 마세요.`;

    const userPrompt = `사용자 요청: "${query}"
${timeSlot ? `현재 시간대: ${timeSlot}` : ""}

## 맛집 목록
${fullSummary}

## 응답 형식 (JSON)
{
  "recommendations": [
    {
      "name": "맛집 이름 (목록에서 정확히)",
      "reason": "추천 이유 (한국어, 1-2문장)",
      "matchScore": 95
    }
  ],
  "tip": "전체 추천에 대한 한줄 팁"
}

## 규칙
1. 맛집은 반드시 위 목록에서 선택 (이름 정확히 일치)
2. 3~6개 추천
3. matchScore는 요청과의 적합도 (0~100)
4. 사용자 요청과 관련 없는 맛집은 제외
5. reason은 해당 맛집이 왜 이 요청에 적합한지 구체적으로 설명
6. JSON만 출력`;

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
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      console.error("OpenAI API error:", await openaiResponse.text());
      return NextResponse.json({ success: false, error: "AI 서비스 오류가 발생했습니다." });
    }

    const openaiData = await openaiResponse.json();
    const content = openaiData.choices?.[0]?.message?.content || "";

    // JSON 파싱 (마크다운 코드블록 제거)
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const jsonStr = (jsonMatch[1] || content).trim();

    let parsed: { recommendations: AIRecommendation[]; tip: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json({ success: false, error: "AI 응답을 처리할 수 없습니다." });
    }

    // 실제 맛집 데이터와 매칭 (hallucination 방지)
    // 정적 + MongoDB 양쪽에서 검색
    const staticRestaurants = getAllRestaurants();
    const matchedRecommendations = parsed.recommendations
      .map((rec) => {
        // 1) 정적 데이터에서 검색
        const fromStatic = staticRestaurants.find(r => r.이름 === rec.name);
        if (fromStatic) {
          return { restaurant: fromStatic, reason: rec.reason, matchScore: rec.matchScore };
        }
        // 2) MongoDB 데이터에서 검색
        const fromDB = customRestaurants.find(r => r.name === rec.name);
        if (fromDB) {
          return { restaurant: toRestaurant(fromDB), reason: rec.reason, matchScore: rec.matchScore };
        }
        return null;
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      recommendations: matchedRecommendations,
      tip: parsed.tip || "",
    });
  } catch (error) {
    console.error("AI recommend error:", error);
    return NextResponse.json({ success: false, error: "추천 처리 중 오류가 발생했습니다." });
  }
}
