import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAllRestaurants } from "@/data/taiwan-food";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// Google 리뷰 타입
interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  language?: string;
}

// 리뷰 캐시 타입
interface ReviewCache {
  restaurantName: string;
  placeId: string;
  reviews: GoogleReview[];
  rating: number | null;
  userRatingsTotal: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// 단일 식당 리뷰 갱신
async function refreshRestaurantReviews(restaurantName: string): Promise<{
  success: boolean;
  restaurantName: string;
  error?: string;
}> {
  try {
    if (!GOOGLE_API_KEY) {
      return { success: false, restaurantName, error: "API key not configured" };
    }

    // Place ID 검색 (대만 타이베이 기준)
    const searchQuery = `${restaurantName} Taipei Taiwan`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      searchQuery
    )}&inputtype=textquery&fields=place_id&key=${GOOGLE_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.candidates || searchData.candidates.length === 0) {
      return { success: false, restaurantName, error: "Place not found" };
    }

    const placeId = searchData.candidates[0].place_id;

    // Place Details에서 리뷰 가져오기 (최신순 정렬)
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&language=ko&reviews_sort=newest&key=${GOOGLE_API_KEY}`;
    const detailRes = await fetch(detailUrl);
    const detailData = await detailRes.json();

    // 리뷰를 최신순으로 정렬 (time 필드는 Unix timestamp)
    const reviews: GoogleReview[] = (detailData.result?.reviews || [])
      .sort((a: GoogleReview, b: GoogleReview) => b.time - a.time);
    const rating = detailData.result?.rating || null;
    const userRatingsTotal = detailData.result?.user_ratings_total || null;

    // MongoDB에 캐시 저장
    const db = await connectToDatabase();
    const collection = db.collection<ReviewCache>("google_reviews_cache");
    const now = new Date();

    await collection.updateOne(
      { restaurantName },
      {
        $set: {
          restaurantName,
          placeId,
          reviews,
          rating,
          userRatingsTotal,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );

    return { success: true, restaurantName };
  } catch (error) {
    return { success: false, restaurantName, error: String(error) };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Cron 시크릿이 설정된 경우 인증 확인
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 모든 식당 목록 가져오기
    const allRestaurants = getAllRestaurants();
    const restaurantNames = allRestaurants.map(r => r.이름);

    // 결과 저장
    const results: { success: string[]; failed: { name: string; error: string }[] } = {
      success: [],
      failed: []
    };

    // 배치 처리 (API 제한 고려하여 10개씩 순차 처리)
    const batchSize = 10;
    const delayBetweenBatches = 2000; // 2초

    for (let i = 0; i < restaurantNames.length; i += batchSize) {
      const batch = restaurantNames.slice(i, i + batchSize);

      // 병렬 처리
      const batchResults = await Promise.all(
        batch.map(name => refreshRestaurantReviews(name))
      );

      // 결과 분류
      for (const result of batchResults) {
        if (result.success) {
          results.success.push(result.restaurantName);
        } else {
          results.failed.push({
            name: result.restaurantName,
            error: result.error || "Unknown error"
          });
        }
      }

      // 다음 배치 전 대기 (마지막 배치 제외)
      if (i + batchSize < restaurantNames.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return NextResponse.json({
      message: "Review refresh completed",
      timestamp: new Date().toISOString(),
      total: restaurantNames.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      failed: results.failed.slice(0, 10) // 처음 10개만 반환
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
