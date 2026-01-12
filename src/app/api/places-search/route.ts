import { NextRequest, NextResponse } from "next/server";

interface PlacePrediction {
  place_id: string;
  description: string;
}

interface PlaceDetailsResult {
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
}

/**
 * Google Places API를 사용한 주소 검색 API
 * POST /api/places-search
 * Body: { query: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "검색어가 필요합니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places API 키가 설정되지 않았습니다.", useOSM: true },
        { status: 500 }
      );
    }

    // 1. Place Autocomplete API 호출
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&components=country:tw&language=ko&key=${apiKey}`;

    const autocompleteResponse = await fetch(autocompleteUrl);
    const autocompleteData = await autocompleteResponse.json();

    if (autocompleteData.status !== "OK" || !autocompleteData.predictions?.length) {
      return NextResponse.json({ results: [], useOSM: true });
    }

    // 2. 각 예측 결과에 대해 Place Details로 좌표 가져오기
    const results: { displayName: string; lat: number; lng: number }[] = [];

    for (const prediction of (autocompleteData.predictions as PlacePrediction[]).slice(0, 5)) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&language=ko&key=${apiKey}`;

        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        const result = detailsData.result as PlaceDetailsResult | undefined;
        if (detailsData.status === "OK" && result?.geometry?.location) {
          results.push({
            displayName: prediction.description,
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          });
        }
      } catch {
        // 개별 상세 조회 실패 시 건너뛰기
        continue;
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Places search error:", error);
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다.", useOSM: true },
      { status: 500 }
    );
  }
}
