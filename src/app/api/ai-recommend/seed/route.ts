import { NextResponse } from "next/server";
import { getAllRestaurants, getRestaurantSummaryForAI } from "@/data/taiwan-food";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * 프리셋 AI 추천 결과를 미리 생성하여 MongoDB에 저장
 * GET /api/ai-recommend/seed
 *
 * 8개 프리셋 쿼리에 대해 OpenAI를 한 번씩 호출하고
 * 결과를 ai_preset_cache 컬렉션에 저장.
 * → 이후 프리셋 클릭 시 OpenAI 호출 없이 즉시 반환.
 */

const PRESET_QUERIES = [
  { key: "spicy", query: "매운 음식이 먹고 싶어요" },
  { key: "value", query: "가격 대비 양이 많은 가성비 좋은 맛집" },
  { key: "date", query: "분위기 좋은 데이트 맛집" },
  { key: "solo", query: "혼자서 편하게 먹을 수 있는 맛집" },
  { key: "nightmarket", query: "야시장에서 꼭 먹어봐야 할 음식" },
  { key: "dessert", query: "달콤한 디저트와 음료" },
  { key: "local", query: "관광객보다 현지인이 더 많이 가는 로컬 맛집" },
  { key: "noodle", query: "맛있는 면 요리 전문점" },
];

interface AIRecommendation {
  name: string;
  reason: string;
  matchScore: number;
}

export async function GET() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return NextResponse.json({ success: false, error: "OPENAI_API_KEY not set" });
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection("ai_preset_cache");
    const staticSummary = getRestaurantSummaryForAI();
    const staticRestaurants = getAllRestaurants();

    // MongoDB 사용자 등록 맛집도 포함
    let customSummary = "";
    let customRestaurants: Record<string, unknown>[] = [];
    try {
      const customCollection = db.collection("custom_restaurants");
      customRestaurants = await customCollection
        .find({ deleted: { $ne: true } })
        .project({ name: 1, category: 1, address: 1, feature: 1, google_rating: 1, google_reviews_count: 1 })
        .toArray() as Record<string, unknown>[];

      if (customRestaurants.length > 0) {
        customSummary = customRestaurants
          .map(r => {
            const parts = [r.name as string];
            if (r.category) parts.push(`[${r.category}]`);
            if (r.address) parts.push(r.address as string);
            if (r.google_rating) parts.push(`⭐${r.google_rating}`);
            if (r.feature) parts.push((r.feature as string).substring(0, 40));
            return parts.join(" | ");
          })
          .join("\n");
      }
    } catch {
      // DB 실패해도 계속 진행
    }

    const fullSummary = customSummary
      ? `${staticSummary}\n\n## 사용자 등록 맛집\n${customSummary}`
      : staticSummary;

    const systemPrompt = `당신은 대만 타이베이 맛집 추천 전문가입니다.
사용자의 요청에 맞는 맛집을 아래 목록에서 선택하여 추천합니다.
응답은 반드시 JSON 형식으로만 해주세요. 다른 텍스트는 포함하지 마세요.`;

    const results: { key: string; query: string; status: string }[] = [];

    // 순차 실행 (API rate limit 방지)
    for (const preset of PRESET_QUERIES) {
      try {
        const userPrompt = `사용자 요청: "${preset.query}"

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
          results.push({ key: preset.key, query: preset.query, status: "openai_error" });
          continue;
        }

        const openaiData = await openaiResponse.json();
        const content = openaiData.choices?.[0]?.message?.content || "";

        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        const jsonStr = (jsonMatch[1] || content).trim();
        const parsed: { recommendations: AIRecommendation[]; tip: string } = JSON.parse(jsonStr);

        // 실제 맛집 데이터와 매칭
        const matchedRecommendations = parsed.recommendations
          .map((rec) => {
            const fromStatic = staticRestaurants.find(r => r.이름 === rec.name);
            if (fromStatic) {
              return { restaurant: fromStatic, reason: rec.reason, matchScore: rec.matchScore };
            }
            const fromDB = customRestaurants.find(r => r.name === rec.name);
            if (fromDB) {
              return {
                restaurant: {
                  이름: fromDB.name as string,
                  위치: (fromDB.address as string) || "",
                  특징: (fromDB.feature as string) || "",
                  평점: (fromDB.google_rating as number) || undefined,
                  리뷰수: (fromDB.google_reviews_count as number) || undefined,
                  category: (fromDB.category as string) || undefined,
                },
                reason: rec.reason,
                matchScore: rec.matchScore,
              };
            }
            return null;
          })
          .filter(Boolean);

        // MongoDB에 저장 (upsert)
        await collection.updateOne(
          { query: preset.query },
          {
            $set: {
              key: preset.key,
              query: preset.query,
              recommendations: matchedRecommendations,
              tip: parsed.tip || "",
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        results.push({ key: preset.key, query: preset.query, status: `ok (${matchedRecommendations.length} items)` });
      } catch (err) {
        results.push({ key: preset.key, query: preset.query, status: `error: ${err}` });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: "시드 생성 실패" }, { status: 500 });
  }
}
