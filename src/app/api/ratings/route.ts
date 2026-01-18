import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// 캐시된 리뷰 타입
interface ReviewCache {
  restaurantName: string;
  placeId: string;
  rating: number | null;
  userRatingsTotal: number | null;
  updatedAt: Date;
}

// 여러 맛집의 평점을 일괄 조회
export async function POST(request: NextRequest) {
  try {
    const { names } = await request.json();

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ error: "names array required" }, { status: 400 });
    }

    const db = await connectToDatabase();
    const collection = db.collection<ReviewCache>("google_reviews_cache");

    // 캐시된 평점 조회
    const cached = await collection
      .find({ restaurantName: { $in: names } })
      .project({ restaurantName: 1, rating: 1, userRatingsTotal: 1, updatedAt: 1 })
      .toArray();

    // 결과를 맵으로 변환
    const ratingsMap: Record<string, { rating: number | null; userRatingsTotal: number | null }> = {};

    for (const item of cached) {
      ratingsMap[item.restaurantName] = {
        rating: item.rating,
        userRatingsTotal: item.userRatingsTotal,
      };
    }

    return NextResponse.json({ ratings: ratingsMap });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
