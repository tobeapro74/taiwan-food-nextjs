import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

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

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  const publicId = toPublicId(query);

  try {
    // 1. Cloudinary에서 캐시된 이미지 확인
    try {
      const existingImage = await cloudinary.api.resource(publicId);
      if (existingImage?.secure_url) {
        // 캐시된 이미지 반환 (최적화된 URL)
        const optimizedUrl = cloudinary.url(publicId, {
          fetch_format: "auto",
          quality: "auto",
          width: 400,
          height: 300,
          crop: "fill",
        });
        return NextResponse.json({ photoUrl: optimizedUrl, cached: true });
      }
    } catch {
      // 이미지가 없으면 계속 진행
    }

    // 2. Google Places API 키 확인
    if (!GOOGLE_API_KEY) {
      return NextResponse.json({ photoUrl: null, error: "API key not configured" });
    }

    // 3. Google Places API로 사진 검색
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
      query + " Taiwan"
    )}&inputtype=textquery&fields=place_id,photos&key=${GOOGLE_API_KEY}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.candidates || searchData.candidates.length === 0) {
      return NextResponse.json({ photoUrl: null });
    }

    const candidate = searchData.candidates[0];

    // 4. 사진 참조 가져오기
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
      return NextResponse.json({ photoUrl: null });
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

      return NextResponse.json({ photoUrl: optimizedUrl, cached: false, uploaded: true });
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      // 업로드 실패해도 Google 원본 URL 반환
      return NextResponse.json({ photoUrl: googlePhotoUrl, cached: false });
    }
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 });
  }
}
