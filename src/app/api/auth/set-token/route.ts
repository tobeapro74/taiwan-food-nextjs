import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

// iOS 딥링크에서 받은 토큰을 httpOnly 쿠키로 설정
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "토큰이 필요합니다." },
        { status: 400 }
      );
    }

    // 토큰 유효성 검증
    jwt.verify(token, JWT_SECRET) as JWTPayload;

    const response = NextResponse.json({ success: true });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "유효하지 않은 토큰입니다." },
      { status: 401 }
    );
  }
}
