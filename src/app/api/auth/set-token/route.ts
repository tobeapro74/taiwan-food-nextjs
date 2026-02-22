import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

// GET: 딥링크에서 토큰을 받아 쿠키 설정 후 메인 페이지로 리다이렉트
// (CapacitorHttp가 fetch를 프록시하여 POST의 Set-Cookie가 WebView에 안 붙는 문제 우회)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    jwt.verify(token, JWT_SECRET) as JWTPayload;

    const response = NextResponse.redirect(new URL("/", request.url));

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

// POST: 기존 방식 (웹 브라우저용)
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
