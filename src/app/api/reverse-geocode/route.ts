import { NextRequest, NextResponse } from "next/server";

/**
 * Google Geocoding API를 사용하여 좌표를 주소로 변환 (역지오코딩)
 * POST /api/reverse-geocode
 * Body: { lat: number, lng: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { success: false, error: "좌표(lat, lng)가 필요합니다." },
        { status: 400 }
      );
    }

    // 좌표 유효성 검사
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 좌표입니다." },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: "좌표 범위가 유효하지 않습니다." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Google API 키가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // Google Geocoding API 호출
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=ko&key=${apiKey}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { success: false, error: "해당 좌표의 주소를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 가장 정확한 주소 선택 (첫 번째 결과)
    const result = data.results[0];

    return NextResponse.json({
      success: true,
      data: {
        address: result.formatted_address,
        coordinates: {
          lat: latitude,
          lng: longitude,
        },
        place_id: result.place_id,
      },
    });
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return NextResponse.json(
      { success: false, error: "주소 변환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
