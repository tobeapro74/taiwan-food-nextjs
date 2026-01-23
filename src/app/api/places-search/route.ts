import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, createSessionToken } from "@/lib/google-session-token";

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
 * Body: { query: string, sessionToken?: string }
 *
 * sessionToken을 사용하면 Autocomplete + Place Details가 한 세션으로 묶여
 * 비용이 크게 절감됩니다 (약 70~80%)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, sessionToken: clientToken } = body;

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

    // sessionToken 처리: 클라이언트에서 받거나 새로 생성
    const sessionToken = isValidSessionToken(clientToken) ? clientToken : createSessionToken();

    // 1. Place Autocomplete API 호출 (sessionToken 포함)
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&components=country:tw&language=ko&sessiontoken=${sessionToken}&key=${apiKey}`;

    const autocompleteResponse = await fetch(autocompleteUrl);
    const autocompleteData = await autocompleteResponse.json();

    if (autocompleteData.status !== "OK" || !autocompleteData.predictions?.length) {
      return NextResponse.json({ results: [], useOSM: true });
    }

    // 2. 각 예측 결과에 대해 Place Details로 좌표 가져오기 (동일 sessionToken 사용)
    const results: { displayName: string; lat: number; lng: number }[] = [];

    for (const prediction of (autocompleteData.predictions as PlacePrediction[]).slice(0, 5)) {
      try {
        // sessionToken을 Place Details에도 전달하여 한 세션으로 묶음 (비용 절감)
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry&language=ko&sessiontoken=${sessionToken}&key=${apiKey}`;

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

    // 응답에 sessionToken 포함 (클라이언트가 Place Details 호출 시 재사용 가능)
    return NextResponse.json({ results, sessionToken });
  } catch (error) {
    console.error("Places search error:", error);
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다.", useOSM: true },
      { status: 500 }
    );
  }
}
