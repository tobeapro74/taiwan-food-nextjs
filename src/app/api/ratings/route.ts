import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ratingCache, CacheHeaders } from "@/lib/cache";

// 캐시된 리뷰 타입
interface ReviewCache {
  restaurantName: string;
  placeId: string;
  rating: number | null;
  userRatingsTotal: number | null;
  updatedAt: Date;
}

type RatingData = { rating: number | null; userRatingsTotal: number | null };

// 여러 맛집의 평점을 일괄 조회
export async function POST(request: NextRequest) {
  try {
    const { names } = await request.json();

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ error: "names array required" }, { status: 400 });
    }

    const ratingsMap: Record<string, RatingData> = {};
    const uncachedNames: string[] = [];

    // 1. 서버 메모리 캐시 확인
    for (const name of names) {
      const cached = ratingCache.get(name);
      if (cached) {
        ratingsMap[name] = {
          rating: cached.rating,
          userRatingsTotal: cached.reviewsCount,
        };
      } else {
        uncachedNames.push(name);
      }
    }

    // 2. 캐시되지 않은 항목만 MongoDB에서 조회
    if (uncachedNames.length > 0) {
      const db = await connectToDatabase();
      const collection = db.collection<ReviewCache>("google_reviews_cache");

      const dbResults = await collection
        .find({ restaurantName: { $in: uncachedNames } })
        .project({ restaurantName: 1, rating: 1, userRatingsTotal: 1, updatedAt: 1 })
        .toArray();

      // DB 결과를 메모리 캐시에 저장
      for (const item of dbResults) {
        const data: RatingData = {
          rating: item.rating,
          userRatingsTotal: item.userRatingsTotal,
        };
        ratingsMap[item.restaurantName] = data;

        // 메모리 캐시에 저장 (5분 TTL)
        ratingCache.set(item.restaurantName, {
          rating: item.rating,
          reviewsCount: item.userRatingsTotal,
        });
      }
    }

    return NextResponse.json(
      { ratings: ratingsMap },
      { headers: CacheHeaders.RATING }
    );
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
