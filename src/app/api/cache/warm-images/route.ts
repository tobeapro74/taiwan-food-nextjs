import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAllRestaurants } from "@/data/taiwan-food";

/**
 * 모든 정적 맛집 이미지를 미리 캐시하는 API
 * - image_cache에 없는 맛집만 개별 place-photo API 호출
 * - 한번 실행하면 이후 홈 화면 이미지가 즉시 로드됨
 *
 * GET /api/cache/warm-images?key=admin123
 */

const ADMIN_KEY = process.env.CACHE_WARM_KEY || "admin123";

export async function GET(request: NextRequest) {
  // 간단한 인증
  const key = request.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await connectToDatabase();
    const allRestaurants = getAllRestaurants();

    // 이미 캐시된 이미지 조회
    const cachedImages = await db.collection("image_cache")
      .find({ photoUrl: { $ne: "" }, isClosed: { $ne: true } })
      .project({ restaurantName: 1 })
      .toArray();

    const cachedNames = new Set(cachedImages.map(item => item.restaurantName));

    // 캐시 안 된 맛집 필터링
    const uncached = allRestaurants.filter(r => !cachedNames.has(r.이름));

    if (uncached.length === 0) {
      return NextResponse.json({
        success: true,
        message: "모든 이미지가 이미 캐시되어 있습니다.",
        total: allRestaurants.length,
        cached: cachedNames.size,
        remaining: 0,
      });
    }

    // 순차적으로 place-photo API 호출 (동시 호출 시 Google API 제한 방지)
    const baseUrl = request.nextUrl.origin;
    const results: { name: string; status: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    // 5개씩 배치 처리
    const BATCH_SIZE = 5;
    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      const batch = uncached.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (restaurant) => {
        try {
          const query = `${restaurant.이름} ${restaurant.위치 || ""}`.trim();
          const res = await fetch(
            `${baseUrl}/api/place-photo?query=${encodeURIComponent(query)}&name=${encodeURIComponent(restaurant.이름)}`
          );
          const data = await res.json();

          if (data.photoUrl) {
            successCount++;
            return { name: restaurant.이름, status: "cached" };
          } else {
            failCount++;
            return { name: restaurant.이름, status: "no_photo" };
          }
        } catch (error) {
          failCount++;
          return { name: restaurant.이름, status: "error" };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // 배치 간 짧은 대기 (API 제한 방지)
      if (i + BATCH_SIZE < uncached.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      total: allRestaurants.length,
      alreadyCached: cachedNames.size,
      newlyCached: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("Image warm-up error:", error);
    return NextResponse.json({ error: "Failed to warm image cache" }, { status: 500 });
  }
}
