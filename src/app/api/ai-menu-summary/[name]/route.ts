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
    const prompt = `다음은 "${restaurantName}" 식당의 구글 리뷰입니다. 리뷰는 한국어, 중국어, 일본어, 영어 등 다양한 언어로 작성되어 있을 수 있습니다.

${reviewTexts.join("\n\n")}

위 리뷰를 분석해서 아래 JSON 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "topMenus": ["메뉴1", "메뉴2", "메뉴3"],
  "topReviews": ["대표리뷰1", "대표리뷰2", "대표리뷰3"]
}

규칙:
- topMenus: 리뷰에 언급된 구체적인 음식/메뉴 이름 최대 3개. 언급이 없으면 빈 배열 []. 메뉴명은 원어 그대로 유지 (예: 딤섬, 小籠包, 牛肉麵)
- topReviews: 가장 유익하고 구체적인 리뷰 문장 최대 3개. 어떤 언어로 작성된 리뷰든 반드시 한국어로 번역해서 핵심만 30자 이내로 요약
- 반드시 순수 JSON만 반환`;

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
