import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/mongodb";
import { getAllRestaurants } from "@/data/taiwan-food";

/**
 * 전체 맛집 사진 10장을 Cloudinary에 미리 업로드하고 place_photos_cache에 저장
 * GET /api/cache/warm-photos?key=admin123&offset=0&limit=10
 *
 * - offset/limit으로 나눠서 호출 가능 (한번에 너무 많으면 타임아웃)
 * - 이미 캐시된 맛집은 건너뜀
 */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ADMIN_KEY = process.env.CACHE_WARM_KEY || "admin123";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Google API key missing" }, { status: 500 });

  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "5");

  const db = await connectToDatabase();
  const cacheCol = db.collection("place_photos_cache");

  // 이미 캐시된 맛집 목록
  const cached = await cacheCol.find(
    { "photos.0": { $regex: "cloudinary.com" } },
    { projection: { placeName: 1 } }
  ).toArray();
  const cachedNames = new Set(cached.map(d => d.placeName));

  const allRestaurants = getAllRestaurants();
  const targets = allRestaurants
    .filter(r => !cachedNames.has(r.이름))
    .slice(offset, offset + limit);

  const results: { name: string; status: string; count?: number }[] = [];

  for (const restaurant of targets) {
    const placeName = restaurant.이름;
    try {
      // Google Places 검색
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(placeName + " Taiwan Taipei")}&language=ko&key=${apiKey}`
      );
      const searchData = await searchRes.json();
      if (searchData.status !== "OK" || !searchData.results?.length) {
        results.push({ name: placeName, status: "no_place" });
        continue;
      }

      const placeId = searchData.results[0].place_id;

      // Place Details로 photo_reference 획득
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&language=ko&key=${apiKey}`
      );
      const detailsData = await detailsRes.json();
      if (detailsData.status !== "OK" || !detailsData.result?.photos) {
        results.push({ name: placeName, status: "no_photos" });
        continue;
      }

      // 최대 10장 Cloudinary 업로드 (순차)
      const safeId = placeName.replace(/[^a-zA-Z0-9가-힣]/g, "_").substring(0, 40);
      const photoRefs = detailsData.result.photos.slice(0, 10);
      const photoUrls: string[] = [];

      for (let idx = 0; idx < photoRefs.length; idx++) {
        try {
          const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRefs[idx].photo_reference}&key=${apiKey}`;
          const result = await cloudinary.uploader.upload(photoApiUrl, {
            public_id: `taiwan-photos/${safeId}_${idx}`,
            overwrite: false,
          });
          photoUrls.push(result.secure_url);
        } catch {
          // 개별 실패는 무시하고 계속
        }
      }

      // place_photos_cache에 저장
      await cacheCol.updateOne(
        { placeName },
        { $set: { placeName, photos: photoUrls, placeId, cachedAt: new Date() } },
        { upsert: true }
      );

      results.push({ name: placeName, status: "ok", count: photoUrls.length });
    } catch (e) {
      results.push({ name: placeName, status: "error" });
      console.error(`warm-photos error for ${placeName}:`, e);
    }
  }

  const remaining = allRestaurants.filter(r => !cachedNames.has(r.이름)).length - targets.length;

  return NextResponse.json({
    success: true,
    processed: results.length,
    remaining: Math.max(0, remaining),
    nextOffset: offset + limit,
    results,
  });
}
