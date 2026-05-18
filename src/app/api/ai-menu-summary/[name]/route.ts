import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { connectToDatabase } from "@/lib/mongodb";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AiSummary {
  restaurantName: string;
  topMenus: string[];
  topReviews: string[];
  analyzedAt: Date;
  reviewCount: number;
}

async function getCachedSummary(restaurantName: string): Promise<AiSummary | null> {
  try {
    const db = await connectToDatabase();
    const col = db.collection<AiSummary>("ai_menu_summary");
    const cached = await col.findOne({ restaurantName });
    if (!cached) return null;

    // 7일 캐시
    const age = Date.now() - new Date(cached.analyzedAt).getTime();
    if (age > 7 * 24 * 60 * 60 * 1000) return null;

    return cached;
  } catch {
    return null;
  }
}

async function saveSummary(data: AiSummary): Promise<void> {
  try {
    const db = await connectToDatabase();
    const col = db.collection<AiSummary>("ai_menu_summary");
    await col.updateOne(
      { restaurantName: data.restaurantName },
      { $set: data },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to save AI summary:", error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const restaurantName = decodeURIComponent(name);

    // 1. 캐시 확인
    const cached = await getCachedSummary(restaurantName);
    if (cached) {
      return NextResponse.json({
        topMenus: cached.topMenus,
        topReviews: cached.topReviews,
        reviewCount: cached.reviewCount,
        cached: true,
      });
    }

    // 2. MongoDB에서 기존 구글 리뷰 캐시 조회
    const db = await connectToDatabase();
    const reviewsCol = db.collection("google_reviews_cache");
    const reviewDoc = await reviewsCol.findOne({ restaurantName });

    if (!reviewDoc || !reviewDoc.reviews || reviewDoc.reviews.length === 0) {
      return NextResponse.json({ error: "리뷰 없음" }, { status: 404 });
    }

    const reviews: Array<{ text: string; rating: number }> = reviewDoc.reviews;
    const reviewTexts = reviews
      .filter((r) => r.text && r.text.trim().length > 10)
      .map((r, i) => `[리뷰 ${i + 1}] (별점 ${r.rating}점) ${r.text.trim()}`);

    if (reviewTexts.length === 0) {
      return NextResponse.json({ error: "유효한 리뷰 없음" }, { status: 404 });
    }

    // 3. Claude Haiku로 분석
    const prompt = `당신은 다국어 번역 및 리뷰 분석 전문가입니다. 아래는 "${restaurantName}" 식당의 구글 리뷰입니다.

${reviewTexts.join("\n\n")}

[필수 지침]
1. topReviews의 모든 항목은 반드시 한국어로 작성해야 합니다. 중국어(繁體/簡體), 영어, 일본어 등 다른 언어는 절대 사용 금지.
2. 원문이 외국어이면 한국어로 완전히 번역한 뒤 핵심만 30자 이내로 요약하세요.
3. topMenus는 원어 메뉴명 유지 가능 (예: 小籠包, 牛扎餅).

아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 순수 JSON만 반환:

{
  "topMenus": ["메뉴1", "메뉴2", "메뉴3"],
  "topReviews": ["한국어 요약1", "한국어 요약2", "한국어 요약3"]
}

topMenus: 리뷰에 언급된 음식/메뉴 이름 최대 3개. 없으면 []
topReviews: 유익한 리뷰 핵심 최대 3개. 반드시 한국어만 사용`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: { topMenus: string[]; topReviews: string[] };
    try {
      parsed = JSON.parse(responseText.trim());
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "AI 파싱 실패" }, { status: 500 });
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    const summary: AiSummary = {
      restaurantName,
      topMenus: (parsed.topMenus || []).slice(0, 3),
      topReviews: (parsed.topReviews || []).slice(0, 3),
      analyzedAt: new Date(),
      reviewCount: reviews.length,
    };

    await saveSummary(summary);

    return NextResponse.json({
      topMenus: summary.topMenus,
      topReviews: summary.topReviews,
      reviewCount: summary.reviewCount,
      cached: false,
    });
  } catch (error) {
    console.error("AI menu summary error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
