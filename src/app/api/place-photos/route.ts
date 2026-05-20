import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

/**
 * 맛집 사진 10장 조회 API
 * GET /api/place-photos?name=딩타이펑
 *
 * place_photos_cache에서 Cloudinary URL 반환.
 * 없으면 빈 배열 반환 (클라이언트에서 place-photo API로 fallback).
 */
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ photos: [] });

  try {
    const db = await connectToDatabase();
    const doc = await db.collection("place_photos_cache").findOne({ placeName: name });

    // Cloudinary URL만 반환 (만료 URL 제외)
    const photos = (doc?.photos || []).filter((url: string) =>
      url.includes("cloudinary.com")
    );

    return NextResponse.json({ photos, cached: photos.length > 0 });
  } catch {
    return NextResponse.json({ photos: [] });
  }
}
