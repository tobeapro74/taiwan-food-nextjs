import { NextRequest, NextResponse } from "next/server";
import { isValidSessionToken, createSessionToken } from "@/lib/google-session-token";

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
  }>;
  types?: string[];
  // 비용 최적화: website, url 필드 제거 (미사용)
}

/**
 * Google Places API를 사용하여 장소 상세 정보 조회
 * POST /api/google-place-details
 * Body: { placeId: string, sessionToken?: string } 또는 { query: string }
 *
 * sessionToken을 사용하면 Autocomplete에서 받은 placeId로 Details 조회 시
 * 한 세션으로 묶여 비용이 크게 절감됩니다
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { placeId, query, sessionToken: clientToken } = body;

    // sessionToken 처리: Autocomplete에서 받은 토큰 사용 또는 새로 생성
    const sessionToken = isValidSessionToken(clientToken) ? clientToken : createSessionToken();

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    let targetPlaceId = placeId;

    // placeId가 없고 query가 있으면 먼저 검색
    if (!targetPlaceId && query) {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query + " Taiwan"
      )}&language=ko&key=${apiKey}`;

      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.status === "OK" && searchData.results?.length > 0) {
        targetPlaceId = searchData.results[0].place_id;
      } else {
        return NextResponse.json(
          { error: "장소를 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    if (!targetPlaceId) {
      return NextResponse.json(
        { error: "placeId 또는 query가 필요합니다." },
        { status: 400 }
      );
    }

    // Place Details API 호출 (sessionToken 포함, fields 최적화)
    // 비용 절감: 실제 사용하는 필드만 요청 (website, url 제거 - 미사용)
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${targetPlaceId}&fields=place_id,name,formatted_address,geometry,rating,user_ratings_total,price_level,formatted_phone_number,opening_hours,photos,types&sessiontoken=${sessionToken}&language=ko&key=${apiKey}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== "OK") {
      return NextResponse.json(
        { error: "장소 상세 정보를 가져올 수 없습니다.", details: detailsData.status },
        { status: 404 }
      );
    }

    const place: PlaceDetails = detailsData.result;

    // 영문 이름/주소 조회 (Basic 필드만 - 비용 최소화)
    let name_en: string | undefined;
    let address_en: string | undefined;
    try {
      const enUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${targetPlaceId}&fields=name,formatted_address&language=en&key=${apiKey}`;
      const enResponse = await fetch(enUrl);
      const enData = await enResponse.json();
      if (enData.status === "OK" && enData.result) {
        name_en = enData.result.name;
        address_en = enData.result.formatted_address;
      }
    } catch {
      // 영문 조회 실패해도 무시 - 한국어만 사용
    }

    // 사진 URL 생성 (최대 3장)
    const photoUrls: string[] = [];
    if (place.photos && place.photos.length > 0) {
      for (const photo of place.photos.slice(0, 3)) {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`;
        photoUrls.push(photoUrl);
      }
    }

    // 카테고리 추론
    const categoryMap: Record<string, string> = {
      restaurant: "밥류",
      food: "밥류",
      cafe: "카페",
      bakery: "디저트",
      bar: "밥류",
      meal_takeaway: "길거리음식",
      meal_delivery: "밥류",
    };

    let suggestedCategory = "밥류";
    if (place.types) {
      for (const type of place.types) {
        if (categoryMap[type]) {
          suggestedCategory = categoryMap[type];
          break;
        }
      }
    }

    // 가격대 텍스트 변환
    const priceLevelText: Record<number, string> = {
      0: "무료",
      1: "저렴 (NT$100 이하)",
      2: "보통 (NT$100~300)",
      3: "비쌈 (NT$300~600)",
      4: "매우 비쌈 (NT$600 이상)",
    };

    return NextResponse.json({
      success: true,
      data: {
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
        rating: place.rating,
        reviews_count: place.user_ratings_total,
        price_level: place.price_level,
        price_level_text: place.price_level !== undefined ? priceLevelText[place.price_level] : undefined,
        phone_number: place.formatted_phone_number,
        opening_hours: place.opening_hours?.weekday_text,
        photos: photoUrls,
        suggested_category: suggestedCategory,
        types: place.types,
        name_en,
        address_en,
      },
    });
  } catch (error) {
    console.error("Google Place Details error:", error);
    return NextResponse.json(
      { error: "장소 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * Google Places API를 사용하여 식당 검색 (자동완성)
 * GET /api/google-place-details?q=검색어&sessionToken=xxx
 * GET /api/google-place-details?q=검색어&mode=textsearch (Text Search - 리뷰 수 포함)
 *
 * sessionToken을 포함하면 이후 Place Details 호출과 묶여 비용 절감
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const mode = searchParams.get("mode");
    const clientToken = searchParams.get("sessionToken");

    if (!query) {
      return NextResponse.json(
        { error: "검색어가 필요합니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // Text Search 모드 - 리뷰 수 포함하여 모든 결과 반환 (관리자용)
    if (mode === "textsearch") {
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query + " Taiwan"
      )}&language=ko&key=${apiKey}`;

      const textSearchResponse = await fetch(textSearchUrl);
      const textSearchData = await textSearchResponse.json();

      if (textSearchData.status !== "OK") {
        return NextResponse.json({ results: [] });
      }

      // Text Search 결과에는 rating, user_ratings_total이 포함됨
      const results = textSearchData.results.map(
        (place: {
          place_id: string;
          name: string;
          formatted_address: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
        }) => ({
          place_id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          coordinates: place.geometry.location,
          rating: place.rating,
          reviews_count: place.user_ratings_total,
        })
      );

      return NextResponse.json({ results });
    }

    // sessionToken 처리: 클라이언트에서 받거나 새로 생성
    const sessionToken = isValidSessionToken(clientToken) ? clientToken : createSessionToken();

    // 기본 모드 - Autocomplete (자동완성) - sessionToken 포함
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&components=country:tw&types=establishment&language=ko&sessiontoken=${sessionToken}&key=${apiKey}`;

    const autocompleteResponse = await fetch(autocompleteUrl);
    const autocompleteData = await autocompleteResponse.json();

    if (autocompleteData.status !== "OK") {
      return NextResponse.json({ results: [] });
    }

    const results = autocompleteData.predictions.slice(0, 5).map(
      (prediction: { place_id: string; description: string; structured_formatting?: { main_text: string; secondary_text: string } }) => ({
        place_id: prediction.place_id,
        description: prediction.description,
        name: prediction.structured_formatting?.main_text || prediction.description,
        secondary_text: prediction.structured_formatting?.secondary_text || "",
      })
    );

    // sessionToken 포함하여 클라이언트가 Place Details 호출 시 재사용 가능
    return NextResponse.json({ results, sessionToken });
  } catch (error) {
    console.error("Google Place Search error:", error);
    return NextResponse.json(
      { error: "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
