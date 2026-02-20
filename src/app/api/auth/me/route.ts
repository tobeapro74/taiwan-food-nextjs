import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // DB에서 사용자 정보 조회 (카카오 사용자 판별용)
    const db = await connectToDatabase();
    const member = await db.collection("members").findOne(
      { id: decoded.userId },
      { projection: { password: 1, kakao_id: 1, profile_image: 1 } }
    );

    return NextResponse.json({
      success: true,
      data: {
        id: decoded.userId,
        name: decoded.name,
        profile_image: member?.profile_image || decoded.profile_image || null,
        is_admin: decoded.is_admin,
        has_password: !!member?.password,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { success: false, error: "인증이 필요합니다." },
      { status: 401 }
    );
  }
}
