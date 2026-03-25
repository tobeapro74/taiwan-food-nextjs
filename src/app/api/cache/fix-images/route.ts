import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { v2 as cloudinary } from "cloudinary";

/**
 * Google API URL로 저장된 이미지를 Cloudinary로 재업로드
 * GET /api/cache/fix-images?key=admin123
 */

const ADMIN_KEY = process.env.CACHE_WARM_KEY || "admin123";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function toPublicId(name: string): string {
  return `taiwan-food/${name.replace(/[^a-zA-Z0-9가-힣]/g, "_").substring(0, 50)}`;
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection("image_cache");

    // Google API URL로 저장된 항목 찾기
    const broken = await collection
      .find({
        photoUrl: { $regex: "^https://maps.googleapis.com" },
        isClosed: { $ne: true },
      })
      .toArray();

    if (broken.length === 0) {
      return NextResponse.json({
        success: true,
        message: "수정할 항목이 없습니다.",
        fixed: 0,
      });
    }

    const results: { name: string; status: string }[] = [];
    let fixedCount = 0;

    // 3개씩 배치 처리
    const BATCH_SIZE = 3;
    for (let i = 0; i < broken.length; i += BATCH_SIZE) {
      const batch = broken.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (item) => {
        const name = item.restaurantName;
        const publicId = toPublicId(name);

        try {
          // Google URL로 Cloudinary에 업로드
          await cloudinary.uploader.upload(item.photoUrl, {
            public_id: publicId,
            folder: "",
            overwrite: true,
            resource_type: "image",
          });

          // 최적화된 URL 생성
          const optimizedUrl = cloudinary.url(publicId, {
            fetch_format: "auto",
            quality: "auto",
            width: 400,
            height: 300,
            crop: "fill",
          });

          // MongoDB 업데이트
          await collection.updateOne(
            { restaurantName: name },
            { $set: { photoUrl: optimizedUrl, updatedAt: new Date() } }
          );

          fixedCount++;
          return { name, status: "fixed" };
        } catch (error) {
          // Google photo_reference가 만료된 경우 → 새로 검색
          try {
            const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
            const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name + " Taiwan")}&inputtype=textquery&fields=photos,business_status&key=${GOOGLE_API_KEY}`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            const candidate = searchData.candidates?.[0];
            if (!candidate?.photos?.[0]?.photo_reference) {
              return { name, status: "no_photo" };
            }

            const photoRef = candidate.photos[0].photo_reference;
            const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;

            await cloudinary.uploader.upload(googlePhotoUrl, {
              public_id: publicId,
              folder: "",
              overwrite: true,
              resource_type: "image",
            });

            const optimizedUrl = cloudinary.url(publicId, {
              fetch_format: "auto",
              quality: "auto",
              width: 400,
              height: 300,
              crop: "fill",
            });

            await collection.updateOne(
              { restaurantName: name },
              { $set: { photoUrl: optimizedUrl, updatedAt: new Date() } }
            );

            fixedCount++;
            return { name, status: "fixed_with_new_ref" };
          } catch {
            return { name, status: "error" };
          }
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      if (i + BATCH_SIZE < broken.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      totalBroken: broken.length,
      fixed: fixedCount,
      results,
    });
  } catch (error) {
    console.error("Fix images error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
