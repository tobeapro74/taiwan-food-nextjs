import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getDb } from "@/lib/mongodb";
import { imageUrlCache, CacheHeaders } from "@/lib/cache";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// 이미지 캐시 타입
interface ImageCache {
  restaurantName: string;
  photoUrl: string;
  buildingName?: string | null;
  isClosed?: boolean;
  businessStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB에서 캐시된 이미지 조회
async function getCachedImage(restaurantName: string): Promise<ImageCache | null> {
  try {
    const db = await getDb();
    const collection = db.collection<ImageCache>("image_cache");
    return await collection.findOne({ restaurantName });
  } catch {
    return null;
  }
}

// MongoDB에 이미지 캐시 저장
async function saveImageCache(data: Omit<ImageCache, "createdAt" | "updatedAt">): Promise<void> {
  try {
    const db = await getDb();
    const collection = db.collection<ImageCache>("image_cache");
    const now = new Date();
    await collection.updateOne(
      { restaurantName: data.restaurantName },
      {
        $set: { ...data, updatedAt: now },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to save image cache:", error);
  }
}

// MongoDB에서 건물 정보 조회
async function getBuildingFromDB(restaurantName: string): Promise<string | null> {
  try {
    const db = await getDb();
    const collection = db.collection("restaurant_buildings");
    const result = await collection.findOne({ restaurantName });
    return result?.buildingName || null;
  } catch {
    return null;
  }
}

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 이름을 안전한 public_id로 변환
function toPublicId(name: string): string {
  return `taiwan-food/${name.replace(/[^a-zA-Z0-9가-힣]/g, "_").substring(0, 50)}`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const restaurantName = searchParams.get("name"); // 식당 이름 (건물 정보 조회용)

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const publicId = toPublicId(query);

  try {
    // 0. 서버 메모리 캐시 확인 (가장 빠름)
    const cacheKey = restaurantName || query;
    const memCached = imageUrlCache.get(cacheKey);
    if (memCached) {
      return NextResponse.json(
        { photoUrl: memCached, cached: true, source: 'memory' },
        { headers: CacheHeaders.IMAGE }
      );
    }

    // 1. MongoDB 캐시 확인
    if (restaurantName) {
      const cached = await getCachedImage(restaurantName);
      if (cached) {
        // 폐업/휴업 상태인 경우
        if (cached.isClosed) {
          return NextResponse.json({
            photoUrl: null,
            businessStatus: cached.businessStatus,
            isClosed: true,
            cached: true,
            message: cached.businessStatus === "CLOSED_PERMANENTLY" ? "폐업" : "임시휴업"
          });
        }
        // 메모리 캐시에 저장
        imageUrlCache.set(cacheKey, cached.photoUrl);
        // 캐시된 이미지 반환
        return NextResponse.json(
          { photoUrl: cached.photoUrl, buildingName: cached.buildingName, cached: true },
          { headers: CacheHeaders.IMAGE }
        );
      }
    }

    // MongoDB에서 건물 정보 조회 (병렬로 실행)
    const buildingPromise = restaurantName ? getBuildingFromDB(restaurantName) : Promise.resolve(null);

    // 2. Google Places API 키 확인
    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ photoUrl: null, error: "API key not configured" });
    }

    // 3. Google Places API로 사진 검색
    // business_status 필드 추가: OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
    const searchQuery = `${query} Taiwan`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      searchQuery
    )}&inputtype=textquery&fields=place_id,photos,business_status&key=${GOOGLE_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.candidates || searchData.candidates.length === 0) {
      const buildingName = await buildingPromise;
      return NextResponse.json({ photoUrl: null, buildingName });
    }

    const candidate = searchData.candidates[0];

    // 휴업/폐업 상태 확인
    const businessStatus = candidate.business_status;
    // CLOSED_TEMPORARILY: 임시 휴업, CLOSED_PERMANENTLY: 폐업
    if (businessStatus === "CLOSED_TEMPORARILY" || businessStatus === "CLOSED_PERMANENTLY") {
      // MongoDB에 폐업/휴업 상태 캐시
      if (restaurantName) {
        await saveImageCache({
          restaurantName,
          photoUrl: "",
          isClosed: true,
          businessStatus,
        });
      }
      return NextResponse.json({
        photoUrl: null,
        businessStatus,
        isClosed: true,
        message: businessStatus === "CLOSED_PERMANENTLY" ? "폐업" : "임시휴업"
      });
    }

    // 4. 사진 참조 추출
    let photoRef: string | null = null;

    if (candidate.photos && candidate.photos.length > 0) {
      photoRef = candidate.photos[0].photo_reference;
    } else if (candidate.place_id) {
      // Place details에서 사진 가져오기
      const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${candidate.place_id}&fields=photos&key=${GOOGLE_API_KEY}`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();

      if (detailData.result?.photos && detailData.result.photos.length > 0) {
        photoRef = detailData.result.photos[0].photo_reference;
      }
    }

    if (!photoRef) {
      const buildingName = await buildingPromise;
      return NextResponse.json({ photoUrl: null, buildingName });
    }

    // 5. Google 사진 URL 생성
    const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;

    // 6. Cloudinary에 업로드 (캐시)
    try {
      await cloudinary.uploader.upload(googlePhotoUrl, {
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

      const buildingName = await buildingPromise;

      // MongoDB에 캐시 저장
      if (restaurantName) {
        await saveImageCache({
          restaurantName,
          photoUrl: optimizedUrl,
          buildingName,
        });
      }

      // 메모리 캐시에 저장
      imageUrlCache.set(cacheKey, optimizedUrl);

      return NextResponse.json(
        { photoUrl: optimizedUrl, cached: false, uploaded: true, buildingName },
        { headers: CacheHeaders.IMAGE }
      );
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      // 업로드 실패해도 Google 원본 URL 반환
      const buildingName = await buildingPromise;

      // MongoDB에 캐시 저장 (Google URL)
      if (restaurantName) {
        await saveImageCache({
          restaurantName,
          photoUrl: googlePhotoUrl,
          buildingName,
        });
      }

      return NextResponse.json({ photoUrl: googlePhotoUrl, cached: false, buildingName });
    }
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 });
  }
}
