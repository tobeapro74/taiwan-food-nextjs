import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { v2 as cloudinary } from "cloudinary";

/**
 * Google API URL로 저장된 이미지를 삭제 후 새로 캐시
 *
 * Step 1: GET /api/cache/fix-images?key=admin123&action=clean
 *   → Google URL 캐시 삭제
 *
 * Step 2: GET /api/cache/fix-images?key=admin123&action=rebuild
 *   → 캐시 없는 맛집을 새로 검색 → Cloudinary 업로드 → MongoDB 저장
 *   → offset 파라미터로 배치 처리 (한번에 10개씩)
 */

const ADMIN_KEY = process.env.CACHE_WARM_KEY || "admin123";
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function toPublicId(name: string): string {
  return `taiwan-food/${name.replace(/[^a-zA-Z0-9가-힣]/g, "_").substring(0, 50)}`;
}

async function fetchAndUploadImage(name: string, location: string): Promise<{ url: string | null; status: string; error?: string }> {
  try {
    // Step 1: Google Places 검색
    const searchQuery = `${name} Taiwan`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id,photos,business_status&key=${GOOGLE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.status !== "OK") {
      return { url: null, status: "google_error", error: `Google search: ${searchData.status} - ${searchData.error_message || ""}` };
    }

    const candidate = searchData.candidates?.[0];
    if (!candidate?.photos?.[0]?.photo_reference) {
      return { url: null, status: "no_photo" };
    }

    if (candidate.business_status === "CLOSED_PERMANENTLY" || candidate.business_status === "CLOSED_TEMPORARILY") {
      return { url: null, status: "closed" };
    }

    // Step 2: Google photo URL 생성
    const photoRef = candidate.photos[0].photo_reference;
    const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;

    // Step 3: Cloudinary 업로드
    const publicId = toPublicId(name);
    try {
      await cloudinary.uploader.upload(googlePhotoUrl, {
        public_id: publicId,
        folder: "",
        overwrite: true,
        resource_type: "image",
      });
    } catch (uploadErr: unknown) {
      const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      return { url: null, status: "cloudinary_error", error: `Cloudinary upload: ${msg}` };
    }

    const optimizedUrl = cloudinary.url(publicId, {
      fetch_format: "auto",
      quality: "auto",
      width: 400,
      height: 300,
      crop: "fill",
    });

    return { url: optimizedUrl, status: "success" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url: null, status: "error", error: msg };
  }
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action") || "clean";
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
  const BATCH_SIZE = 10;

  try {
    const db = await connectToDatabase();
    const collection = db.collection("image_cache");

    if (action === "clean") {
      // Google URL로 저장된 캐시 삭제
      const result = await collection.deleteMany({
        photoUrl: { $regex: "^https://maps.googleapis.com" },
      });

      return NextResponse.json({
        success: true,
        action: "clean",
        deleted: result.deletedCount,
        message: `${result.deletedCount}개의 잘못된 캐시를 삭제했습니다. 이제 action=rebuild로 재구축하세요.`,
      });
    }

    if (action === "rebuild") {
      // getAllRestaurants 대신 DB에서 캐시 안 된 목록 확인
      const { getAllRestaurants } = await import("@/data/taiwan-food");
      const allRestaurants = getAllRestaurants();

      const cachedNames = await collection
        .find({ photoUrl: { $ne: "" }, isClosed: { $ne: true } })
        .project({ restaurantName: 1 })
        .toArray();

      const cachedSet = new Set(cachedNames.map(i => i.restaurantName));
      const uncached = allRestaurants.filter(r => !cachedSet.has(r.이름));

      if (uncached.length === 0) {
        return NextResponse.json({
          success: true,
          message: "모든 이미지가 캐시되어 있습니다.",
          total: allRestaurants.length,
          cached: cachedSet.size,
        });
      }

      // offset부터 BATCH_SIZE개 처리
      const batch = uncached.slice(offset, offset + BATCH_SIZE);
      if (batch.length === 0) {
        return NextResponse.json({
          success: true,
          message: "더 이상 처리할 항목이 없습니다.",
          remaining: 0,
        });
      }

      const results: { name: string; status: string; error?: string }[] = [];
      let successCount = 0;

      for (const restaurant of batch) {
        const result = await fetchAndUploadImage(restaurant.이름, restaurant.위치 || "");

        if (result.url) {
          await collection.updateOne(
            { restaurantName: restaurant.이름 },
            {
              $set: { restaurantName: restaurant.이름, photoUrl: result.url, updatedAt: new Date() },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );
          successCount++;
        }

        results.push({ name: restaurant.이름, status: result.status, error: result.error });

        // API 호출 간 딜레이
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const remaining = uncached.length - offset - batch.length;

      return NextResponse.json({
        success: true,
        action: "rebuild",
        processed: batch.length,
        successCount,
        remaining: Math.max(0, remaining),
        nextOffset: remaining > 0 ? offset + BATCH_SIZE : null,
        nextUrl: remaining > 0 ? `/api/cache/fix-images?key=${ADMIN_KEY}&action=rebuild&offset=${offset + BATCH_SIZE}` : null,
        results,
      });
    }

    return NextResponse.json({ error: "Invalid action. Use clean or rebuild." }, { status: 400 });
  } catch (error) {
    console.error("Fix images error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
