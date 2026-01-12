import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { fetchPriceInfo } from "../route";
import { getAllRestaurants } from "@/data/taiwan-food";

// GET: 특정 식당의 가격대 정보 조회 (캐시 없으면 실시간 조회)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const restaurantName = decodeURIComponent(name);

    const db = await connectToDatabase();
    const collection = db.collection("restaurant_prices");

    // 1. 캐시 확인
    const cached = await collection.findOne({ restaurantName });

    if (cached) {
      return NextResponse.json({
        restaurantName: cached.restaurantName,
        priceLevel: cached.priceLevel,
        priceRange: cached.priceRange,
        phoneNumber: cached.phoneNumber,
        buildingName: cached.buildingName,
        cached: true
      });
    }

    // 2. 캐시 없으면 Google API에서 실시간 조회
    const restaurants = getAllRestaurants();
    const restaurant = restaurants.find(r => r.이름 === restaurantName);
    const location = restaurant?.위치 || "";

    const { placeId, priceLevel, priceRange, phoneNumber, buildingName } = await fetchPriceInfo(
      restaurantName,
      location
    );

    // 3. 결과 캐시에 저장
    if (placeId || priceRange || phoneNumber || buildingName) {
      await collection.updateOne(
        { restaurantName },
        {
          $set: {
            restaurantName,
            placeId,
            priceLevel,
            priceRange,
            phoneNumber,
            buildingName,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      restaurantName,
      priceLevel,
      priceRange,
      phoneNumber,
      buildingName,
      cached: false
    });
  } catch (error) {
    console.error("Error fetching price:", error);
    return NextResponse.json({ priceRange: null, phoneNumber: null, buildingName: null });
  }
}
