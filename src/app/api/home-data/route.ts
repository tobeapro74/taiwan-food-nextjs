import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ratingCache, restaurantCache, CacheHeaders } from "@/lib/cache";

/**
 * 홈 화면 통합 API
 * - 인기 맛집 평점
 * - 야시장 맛집 평점
 * - 사용자 등록 맛집 목록
 *
 * 기존: 홈 화면 로드 시 3개 이상의 API 호출
 * 개선: 1개의 API 호출로 통합
 */

// 인기 맛집 목록 (정적)
const POPULAR_RESTAURANTS = [
  "鼎泰豐 (본점)", // 딩타이펑
  "阜杭豆漿", // 푸항또우장
  "永康牛肉麵", // 용캉우육면
  "金峰滷肉飯", // 진펑루러우판
  "RAW", // 로앤드리미티드
];

// 야시장 맛집 목록 (정적)
const MARKET_RESTAURANTS = [
  "士林夜市",
  "饒河街夜市",
  "寧夏夜市",
  "通化夜市",
  "公館夜市",
];

interface RatingData {
  rating: number | null;
  reviewsCount: number | null;
}

interface CustomRestaurant {
  place_id: string;
  name: string;
  address: string;
  category: string;
  feature?: string;
  coordinates: { lat: number; lng: number };
  google_rating?: number;
  google_reviews_count?: number;
}

export async function GET() {
  try {
    // 캐시 확인
    const cachedHomeData = restaurantCache.get("home_data");
    if (cachedHomeData) {
      return NextResponse.json(
        { success: true, data: cachedHomeData, cached: true },
        { headers: CacheHeaders.SHORT }
      );
    }

    const db = await connectToDatabase();
    const allNames = [...POPULAR_RESTAURANTS, ...MARKET_RESTAURANTS];

    // 병렬로 데이터 조회
    const [ratingsResult, customRestaurants, imageUrls] = await Promise.all([
      // 1. 평점 조회
      (async () => {
        const uncachedNames: string[] = [];
        const ratingsMap: Record<string, RatingData> = {};

        // 메모리 캐시 확인
        for (const name of allNames) {
          const cached = ratingCache.get(name);
          if (cached) {
            ratingsMap[name] = {
              rating: cached.rating,
              reviewsCount: cached.reviewsCount,
            };
          } else {
            uncachedNames.push(name);
          }
        }

        // 캐시되지 않은 항목은 DB에서 조회
        if (uncachedNames.length > 0) {
          const collection = db.collection("google_reviews_cache");
          const dbResults = await collection
            .find({ restaurantName: { $in: uncachedNames } })
            .project({ restaurantName: 1, rating: 1, userRatingsTotal: 1 })
            .toArray();

          for (const item of dbResults) {
            ratingsMap[item.restaurantName] = {
              rating: item.rating,
              reviewsCount: item.userRatingsTotal,
            };

            // 메모리 캐시에 저장
            ratingCache.set(item.restaurantName, {
              rating: item.rating,
              reviewsCount: item.userRatingsTotal,
            });
          }
        }

        return ratingsMap;
      })(),

      // 2. 사용자 등록 맛집 조회
      (async () => {
        const collection = db.collection("custom_restaurants");
        const results = await collection
          .find({})
          .project({
            place_id: 1,
            name: 1,
            address: 1,
            category: 1,
            feature: 1,
            coordinates: 1,
            google_rating: 1,
            google_reviews_count: 1,
          })
          .toArray();

        return results as unknown as CustomRestaurant[];
      })(),

      // 3. 이미지 URL 조회 (image_cache 컬렉션에서 일괄 조회)
      (async () => {
        try {
          const collection = db.collection("image_cache");
          const results = await collection
            .find({ photoUrl: { $ne: "" }, isClosed: { $ne: true } })
            .project({ restaurantName: 1, photoUrl: 1 })
            .toArray();

          const urlMap: Record<string, string> = {};
          for (const item of results) {
            if (item.restaurantName && item.photoUrl) {
              urlMap[item.restaurantName] = item.photoUrl;
            }
          }
          return urlMap;
        } catch {
          return {} as Record<string, string>;
        }
      })(),
    ]);

    // 인기 맛집 평점 분리
    const popularRatings: Record<string, RatingData> = {};
    for (const name of POPULAR_RESTAURANTS) {
      if (ratingsResult[name]) {
        popularRatings[name] = ratingsResult[name];
      }
    }

    // 야시장 맛집 평점 분리
    const marketRatings: Record<string, RatingData> = {};
    for (const name of MARKET_RESTAURANTS) {
      if (ratingsResult[name]) {
        marketRatings[name] = ratingsResult[name];
      }
    }

    const responseData = {
      popularRatings,
      marketRatings,
      customRestaurants,
      imageUrls,
      timestamp: new Date().toISOString(),
    };

    // 캐시에 저장 (5분)
    restaurantCache.set("home_data", responseData, 5 * 60 * 1000);

    return NextResponse.json(
      { success: true, data: responseData, cached: false },
      { headers: CacheHeaders.SHORT }
    );
  } catch (error) {
    console.error("Home data API error:", error);
    return NextResponse.json(
      { success: false, error: "홈 데이터 조회 실패" },
      { status: 500 }
    );
  }
}
