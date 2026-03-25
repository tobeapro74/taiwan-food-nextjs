import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * 특정 맛집의 image_cache 상태 확인
 * GET /api/cache/check?name=딩타이펑
 * GET /api/cache/check (전체 캐시 목록)
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");

  try {
    const db = await connectToDatabase();
    const collection = db.collection("image_cache");

    if (name) {
      // 특정 맛집 검색 (부분 일치)
      const results = await collection
        .find({ restaurantName: { $regex: name, $options: "i" } })
        .project({ restaurantName: 1, photoUrl: 1, isClosed: 1, updatedAt: 1 })
        .toArray();

      return NextResponse.json({ query: name, count: results.length, results });
    }

    // 전체 캐시 목록 (이름만)
    const all = await collection
      .find({})
      .project({ restaurantName: 1, photoUrl: { $substr: ["$photoUrl", 0, 50] }, isClosed: 1 })
      .toArray();

    return NextResponse.json({ total: all.length, items: all.map(i => ({ name: i.restaurantName, hasPhoto: !!i.photoUrl && i.photoUrl !== "", isClosed: i.isClosed || false })) });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
