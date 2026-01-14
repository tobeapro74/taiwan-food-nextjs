import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get("key")?.trim();
    const expectedKey = process.env.ADMIN_SECRET_KEY?.trim();

    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 무효화할 캐시 타입
    const cacheType = searchParams.get("type") || "all";
    const restaurantName = searchParams.get("name");

    const db = await connectToDatabase();
    const results: Record<string, number> = {};

    // 리뷰 캐시 무효화
    if (cacheType === "all" || cacheType === "reviews") {
      const reviewsCollection = db.collection("google_reviews_cache");

      if (restaurantName) {
        // 특정 식당만 무효화
        const result = await reviewsCollection.deleteOne({ restaurantName });
        results.reviews = result.deletedCount;
      } else {
        // 전체 무효화
        const result = await reviewsCollection.deleteMany({});
        results.reviews = result.deletedCount;
      }
    }

    // 이미지 캐시 무효화
    if (cacheType === "all" || cacheType === "images") {
      const imagesCollection = db.collection("image_cache");

      if (restaurantName) {
        const result = await imagesCollection.deleteOne({ buildingName: restaurantName });
        results.images = result.deletedCount;
      } else {
        const result = await imagesCollection.deleteMany({});
        results.images = result.deletedCount;
      }
    }

    // 가격 캐시 무효화
    if (cacheType === "all" || cacheType === "prices") {
      const pricesCollection = db.collection("restaurant_prices");

      if (restaurantName) {
        const result = await pricesCollection.deleteOne({ restaurantName });
        results.prices = result.deletedCount;
      } else {
        const result = await pricesCollection.deleteMany({});
        results.prices = result.deletedCount;
      }
    }

    return NextResponse.json({
      message: "Cache invalidated successfully",
      timestamp: new Date().toISOString(),
      type: cacheType,
      restaurantName: restaurantName || "all",
      deleted: results
    });
  } catch (error) {
    console.error("Cache invalidation error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET 메소드로 캐시 상태 확인
export async function GET(request: NextRequest) {
  try {
    // 관리자 인증 확인
    const searchParams = request.nextUrl.searchParams;
    const adminKey = searchParams.get("key")?.trim();
    const expectedKey = process.env.ADMIN_SECRET_KEY?.trim();

    if (!expectedKey || adminKey !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await connectToDatabase();

    // 각 캐시 컬렉션의 상태 확인
    const reviewsCount = await db.collection("google_reviews_cache").countDocuments();
    const imagesCount = await db.collection("image_cache").countDocuments();
    const pricesCount = await db.collection("restaurant_prices").countDocuments();

    // 가장 오래된/최신 캐시 확인
    const oldestReview = await db.collection("google_reviews_cache")
      .findOne({}, { sort: { updatedAt: 1 }, projection: { restaurantName: 1, updatedAt: 1 } });
    const newestReview = await db.collection("google_reviews_cache")
      .findOne({}, { sort: { updatedAt: -1 }, projection: { restaurantName: 1, updatedAt: 1 } });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      cache: {
        reviews: {
          count: reviewsCount,
          oldest: oldestReview,
          newest: newestReview
        },
        images: {
          count: imagesCount
        },
        prices: {
          count: pricesCount
        }
      }
    });
  } catch (error) {
    console.error("Cache status error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
