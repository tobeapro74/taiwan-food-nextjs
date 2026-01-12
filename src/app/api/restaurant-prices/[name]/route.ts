import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// GET: 특정 식당의 가격대 정보 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const restaurantName = decodeURIComponent(name);

    const db = await connectToDatabase();
    const collection = db.collection("restaurant_prices");

    const price = await collection.findOne({ restaurantName });

    if (!price) {
      return NextResponse.json({ priceRange: null, phoneNumber: null });
    }

    return NextResponse.json({
      restaurantName: price.restaurantName,
      priceLevel: price.priceLevel,
      priceRange: price.priceRange,
      phoneNumber: price.phoneNumber
    });
  } catch (error) {
    console.error("Error fetching price:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
