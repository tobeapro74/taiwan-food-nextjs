import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// Place ID 캐시 (메모리 캐시)
const placeIdCache: Record<string, string> = {};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    // 1. Place ID 가져오기 (캐시 확인)
    let placeId = placeIdCache[query];

    if (!placeId) {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
        query + " Taiwan"
      )}&inputtype=textquery&fields=place_id,photos&key=${GOOGLE_API_KEY}`;

      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (searchData.candidates && searchData.candidates.length > 0) {
        const candidate = searchData.candidates[0];
        placeId = candidate.place_id;
        placeIdCache[query] = placeId;

        // 사진이 있으면 photo_reference 반환
        if (candidate.photos && candidate.photos.length > 0) {
          const photoRef = candidate.photos[0].photo_reference;
          const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;
          return NextResponse.json({ photoUrl });
        }
      }
    }

    // Place ID로 상세 정보에서 사진 가져오기
    if (placeId) {
      const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_API_KEY}`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();

      if (detailData.result?.photos && detailData.result.photos.length > 0) {
        const photoRef = detailData.result.photos[0].photo_reference;
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${GOOGLE_API_KEY}`;
        return NextResponse.json({ photoUrl });
      }
    }

    // 사진을 찾지 못한 경우
    return NextResponse.json({ photoUrl: null });
  } catch (error) {
    console.error("Google Places API error:", error);
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 });
  }
}
