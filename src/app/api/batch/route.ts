import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ratingCache, imageUrlCache, CacheHeaders } from "@/lib/cache";

/**
 * Batch API - 여러 맛집의 데이터를 한 번에 조회
 *
 * POST /api/batch
 * Body: {
 *   restaurants: string[],  // 맛집 이름 배열
 *   include: ('rating' | 'photo' | 'reviews')[]  // 포함할 데이터
 * }
 */

interface BatchRequest {
  restaurants: string[];
  include: ('rating' | 'photo' | 'reviews')[];
}

interface RatingData {
  rating: number | null;
  reviewsCount: number | null;
}

interface PhotoData {
  photoUrl: string | null;
  isClosed?: boolean;
  businessStatus?: string;
}

interface ReviewData {
  reviews: unknown[];
  rating: number | null;
  reviewsCount: number | null;
}

interface BatchResult {
  rating?: RatingData;
  photo?: PhotoData;
  reviews?: ReviewData;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchRequest = await request.json();
    const { restaurants, include } = body;

    if (!restaurants || !Array.isArray(restaurants) || restaurants.length === 0) {
      return NextResponse.json(
        { error: "restaurants 배열이 필요합니다." },
        { status: 400 }
      );
    }

    if (!include || !Array.isArray(include) || include.length === 0) {
      return NextResponse.json(
        { error: "include 배열이 필요합니다." },
        { status: 400 }
      );
    }

    // 최대 50개 제한
    const limitedRestaurants = restaurants.slice(0, 50);
    const results: Record<string, BatchResult> = {};
    const db = await connectToDatabase();

    // 각 맛집에 대해 결과 초기화
    for (const name of limitedRestaurants) {
      results[name] = {};
    }

    // 병렬로 데이터 조회
    const promises: Promise<void>[] = [];

    // 1. 평점 조회
    if (include.includes('rating')) {
      promises.push(
        (async () => {
          const uncachedNames: string[] = [];

          // 메모리 캐시 확인
          for (const name of limitedRestaurants) {
            const cached = ratingCache.get(name);
            if (cached) {
              results[name].rating = {
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
              const data: RatingData = {
                rating: item.rating,
                reviewsCount: item.userRatingsTotal,
              };
              results[item.restaurantName].rating = data;

              // 메모리 캐시에 저장
              ratingCache.set(item.restaurantName, {
                rating: item.rating,
                reviewsCount: item.userRatingsTotal,
              });
            }
          }
        })()
      );
    }

    // 2. 사진 URL 조회
    if (include.includes('photo')) {
      promises.push(
        (async () => {
          const uncachedNames: string[] = [];

          // 메모리 캐시 확인
          for (const name of limitedRestaurants) {
            const cached = imageUrlCache.get(name);
            if (cached) {
              results[name].photo = { photoUrl: cached };
            } else {
              uncachedNames.push(name);
            }
          }

          // 캐시되지 않은 항목은 DB에서 조회
          if (uncachedNames.length > 0) {
            const collection = db.collection("image_cache");
            const dbResults = await collection
              .find({ restaurantName: { $in: uncachedNames } })
              .project({ restaurantName: 1, photoUrl: 1, isClosed: 1, businessStatus: 1 })
              .toArray();

            for (const item of dbResults) {
              results[item.restaurantName].photo = {
                photoUrl: item.photoUrl || null,
                isClosed: item.isClosed,
                businessStatus: item.businessStatus,
              };

              // 메모리 캐시에 저장 (폐업이 아닌 경우만)
              if (item.photoUrl && !item.isClosed) {
                imageUrlCache.set(item.restaurantName, item.photoUrl);
              }
            }
          }
        })()
      );
    }

    // 3. 리뷰 조회
    if (include.includes('reviews')) {
      promises.push(
        (async () => {
          const collection = db.collection("google_reviews_cache");
          const dbResults = await collection
            .find({ restaurantName: { $in: limitedRestaurants } })
            .project({ restaurantName: 1, reviews: 1, rating: 1, userRatingsTotal: 1 })
            .toArray();

          for (const item of dbResults) {
            results[item.restaurantName].reviews = {
              reviews: item.reviews || [],
              rating: item.rating,
              reviewsCount: item.userRatingsTotal,
            };
          }
        })()
      );
    }

    // 모든 조회 완료 대기
    await Promise.all(promises);

    return NextResponse.json(
      { success: true, results },
      { headers: CacheHeaders.RATING }
    );
  } catch (error) {
    console.error("Batch API error:", error);
    return NextResponse.json(
      { error: "배치 조회 실패" },
      { status: 500 }
    );
  }
}
