import { NextRequest, NextResponse } from "next/server";

// 타이베이 주요 지역 좌표 범위 (대략적)
const TAIPEI_DISTRICTS = [
  {
    id: "ximending",
    label: "시먼딩",
    keywords: ["西門", "Ximending", "萬華", "中華路"],
    center: { lat: 25.0421, lng: 121.5081 },
  },
  {
    id: "zhongshan",
    label: "중산구",
    keywords: ["中山", "Zhongshan", "林森", "南京"],
    center: { lat: 25.0528, lng: 121.5207 },
  },
  {
    id: "xinyi",
    label: "신이구",
    keywords: ["信義", "Xinyi", "101", "市政府"],
    center: { lat: 25.0330, lng: 121.5654 },
  },
  {
    id: "daan",
    label: "다안구",
    keywords: ["大安", "Da'an", "Daan", "忠孝", "敦化", "永康"],
    center: { lat: 25.0267, lng: 121.5436 },
  },
  {
    id: "zhongzheng",
    label: "중정구",
    keywords: ["中正", "Zhongzheng", "台北車站", "Taipei Station", "台北站"],
    center: { lat: 25.0322, lng: 121.5180 },
  },
  {
    id: "wanhua",
    label: "만화구",
    keywords: ["萬華", "Wanhua", "龍山寺", "Longshan"],
    center: { lat: 25.0365, lng: 121.4995 },
  },
  {
    id: "songshan",
    label: "송산구",
    keywords: ["松山", "Songshan", "饒河", "Raohe"],
    center: { lat: 25.0501, lng: 121.5778 },
  },
  {
    id: "shilin",
    label: "스린구",
    keywords: ["士林", "Shilin", "故宮", "Palace Museum"],
    center: { lat: 25.0936, lng: 121.5247 },
  },
  {
    id: "beitou",
    label: "베이터우",
    keywords: ["北投", "Beitou", "溫泉", "Hot Spring"],
    center: { lat: 25.1326, lng: 121.5023 },
  },
  {
    id: "neihu",
    label: "네이후구",
    keywords: ["內湖", "Neihu", "美麗華", "Miramar"],
    center: { lat: 25.0694, lng: 121.5882 },
  },
  {
    id: "banqiao",
    label: "반차오",
    keywords: ["板橋", "Banqiao", "新北", "New Taipei"],
    center: { lat: 25.0146, lng: 121.4636 },
  },
];

// 주소에서 지역 추출
function detectDistrictFromAddress(address: string): string | null {
  const normalizedAddress = address.toLowerCase();

  for (const district of TAIPEI_DISTRICTS) {
    for (const keyword of district.keywords) {
      if (normalizedAddress.includes(keyword.toLowerCase())) {
        return district.id;
      }
    }
  }
  return null;
}

// 좌표에서 가장 가까운 지역 찾기
function findNearestDistrict(lat: number, lng: number): string {
  let nearestId = "zhongshan"; // 기본값
  let minDistance = Infinity;

  for (const district of TAIPEI_DISTRICTS) {
    const distance = Math.sqrt(
      Math.pow(lat - district.center.lat, 2) +
      Math.pow(lng - district.center.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestId = district.id;
    }
  }

  return nearestId;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "숙소명을 2글자 이상 입력해주세요." },
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

    // 타이베이 지역으로 제한하여 검색 (lodging 타입)
    const searchQuery = `${query} 台北`;
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      searchQuery
    )}&types=lodging&components=country:tw&language=ko&key=${apiKey}`;

    const autocompleteResponse = await fetch(autocompleteUrl);
    const autocompleteData = await autocompleteResponse.json();

    if (autocompleteData.status !== "OK" || !autocompleteData.predictions?.length) {
      // lodging으로 못 찾으면 일반 검색 시도
      const generalUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        searchQuery
      )}&components=country:tw&language=ko&key=${apiKey}`;

      const generalResponse = await fetch(generalUrl);
      const generalData = await generalResponse.json();

      if (generalData.status !== "OK" || !generalData.predictions?.length) {
        return NextResponse.json({
          success: true,
          results: [],
          message: "검색 결과가 없습니다.",
        });
      }

      autocompleteData.predictions = generalData.predictions;
    }

    // 상위 3개 결과에 대해 상세 정보 조회
    const results = [];

    for (const prediction of autocompleteData.predictions.slice(0, 3)) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${
          prediction.place_id
        }&fields=name,formatted_address,geometry,types&language=ko&key=${apiKey}`;

        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status === "OK" && detailsData.result) {
          const result = detailsData.result;
          const lat = result.geometry?.location?.lat;
          const lng = result.geometry?.location?.lng;
          const address = result.formatted_address || "";

          // 지역 감지: 주소 키워드 우선, 없으면 좌표 기반
          let districtId = detectDistrictFromAddress(address);
          if (!districtId && lat && lng) {
            districtId = findNearestDistrict(lat, lng);
          }

          const district = TAIPEI_DISTRICTS.find(d => d.id === districtId);

          results.push({
            name: result.name,
            address: address,
            placeId: prediction.place_id,
            lat: lat,
            lng: lng,
            districtId: districtId || "other",
            districtLabel: district?.label || "기타",
            isLodging: result.types?.includes("lodging") || false,
          });
        }
      } catch (error) {
        console.error("Place details error:", error);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Hotel search error:", error);
    return NextResponse.json(
      { success: false, error: "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
