import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAllRestaurants } from "@/data/taiwan-food";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_NEW_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

// 가격대 정보 인터페이스
interface RestaurantPrice {
  restaurantName: string;
  placeId: string | null;
  priceLevel: string | null;
  priceRange: string | null;
  phoneNumber: string | null;
  updatedAt: Date;
}

// priceLevel을 한글 가격대로 변환 (대만 NT$ 기준)
function priceLevelToRange(priceLevel: string | null): string | null {
  switch (priceLevel) {
    case "PRICE_LEVEL_FREE":
      return "무료";
    case "PRICE_LEVEL_INEXPENSIVE":
      return "NT$200 미만";
    case "PRICE_LEVEL_MODERATE":
      return "NT$200~500";
    case "PRICE_LEVEL_EXPENSIVE":
      return "NT$500~1,000";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "NT$1,000 이상";
    default:
      return null;
  }
}

// 식당 이름으로 Google Places에서 가격대 및 전화번호 정보 조회
async function fetchPriceInfo(restaurantName: string, location: string): Promise<{
  placeId: string | null;
  priceLevel: string | null;
  priceRange: string | null;
  phoneNumber: string | null;
}> {
  try {
    const searchUrl = "https://places.googleapis.com/v1/places:searchText";
    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY!,
        "X-Goog-FieldMask": "places.id,places.displayName,places.priceLevel,places.priceRange,places.nationalPhoneNumber,places.internationalPhoneNumber"
      },
      body: JSON.stringify({
        textQuery: `${restaurantName} ${location} Taiwan`,
        languageCode: "ko"
      })
    });

    const data = await response.json();
    const firstPlace = data.places?.[0];

    if (!firstPlace) {
      return { placeId: null, priceLevel: null, priceRange: null, phoneNumber: null };
    }

    const priceLevel = firstPlace.priceLevel || null;
    const phoneNumber = firstPlace.nationalPhoneNumber || firstPlace.internationalPhoneNumber || null;

    // priceRange가 있으면 그것을 사용, 없으면 priceLevel로 변환
    let priceRange: string | null = null;
    if (firstPlace.priceRange) {
      const startPrice = firstPlace.priceRange.startPrice?.units || null;
      const endPrice = firstPlace.priceRange.endPrice?.units || null;
      if (startPrice && endPrice) {
        priceRange = `NT$${Number(startPrice).toLocaleString()}~${Number(endPrice).toLocaleString()}`;
      } else if (startPrice) {
        priceRange = `NT$${Number(startPrice).toLocaleString()}~`;
      } else if (endPrice) {
        priceRange = `~NT$${Number(endPrice).toLocaleString()}`;
      }
    }

    // priceRange가 없으면 priceLevel로 대체
    if (!priceRange) {
      priceRange = priceLevelToRange(priceLevel);
    }

    return {
      placeId: firstPlace.id || null,
      priceLevel,
      priceRange,
      phoneNumber
    };
  } catch (error) {
    console.error(`Error fetching price info for ${restaurantName}:`, error);
    return { placeId: null, priceLevel: null, priceRange: null, phoneNumber: null };
  }
}

// GET: 모든 식당의 가격대 정보 조회
export async function GET() {
  try {
    const db = await connectToDatabase();
    const collection = db.collection<RestaurantPrice>("restaurant_prices");

    const prices = await collection.find({}).toArray();

    return NextResponse.json({
      count: prices.length,
      prices: prices.map(p => ({
        restaurantName: p.restaurantName,
        priceLevel: p.priceLevel,
        priceRange: p.priceRange,
        phoneNumber: p.phoneNumber
      }))
    });
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST: 가격대 정보 일괄 수집 (관리자용)
export async function POST(request: NextRequest) {
  // 간단한 보안 체크
  const searchParams = request.nextUrl.searchParams;
  const adminKey = searchParams.get("key")?.trim();
  const expectedKey = process.env.ADMIN_SECRET_KEY?.trim();
  const forceUpdate = searchParams.get("force") === "true";

  if (!expectedKey || adminKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: "Google API key not configured" }, { status: 500 });
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection<RestaurantPrice>("restaurant_prices");

    // 모든 식당 가져오기
    const restaurants = getAllRestaurants();

    let toProcess = restaurants;
    let existingCount = 0;

    if (!forceUpdate) {
      // 이미 저장된 식당 확인
      const existing = await collection.find({}).toArray();
      const existingNames = new Set(existing.map(e => e.restaurantName));
      existingCount = existingNames.size;

      // 아직 저장되지 않은 식당만 필터링
      toProcess = restaurants.filter(r => !existingNames.has(r.이름));
    }

    const results: { name: string; priceRange: string | null; phoneNumber: string | null; status: string }[] = [];
    let processed = 0;

    // 배치 처리 (API 제한 고려, 한 번에 5개씩)
    const batchSize = 5;
    for (let i = 0; i < toProcess.length; i += batchSize) {
      const batch = toProcess.slice(i, i + batchSize);

      await Promise.all(batch.map(async (restaurant) => {
        const { placeId, priceLevel, priceRange, phoneNumber } = await fetchPriceInfo(
          restaurant.이름,
          restaurant.위치
        );

        await collection.updateOne(
          { restaurantName: restaurant.이름 },
          {
            $set: {
              restaurantName: restaurant.이름,
              placeId,
              priceLevel,
              priceRange,
              phoneNumber,
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );

        results.push({
          name: restaurant.이름,
          priceRange,
          phoneNumber,
          status: "saved"
        });
        processed++;
      }));

      // API 제한 방지를 위한 딜레이
      if (i + batchSize < toProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      message: "Price info collection completed",
      total: restaurants.length,
      alreadyExisted: existingCount,
      processed,
      forceUpdate,
      results
    });
  } catch (error) {
    console.error("Error collecting price info:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
