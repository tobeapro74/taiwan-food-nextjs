import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

// POST: 사용자 활동 로그 기록
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    let userId: number | null = null;
    let userName: string | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        userId = decoded.userId;
        userName = decoded.name;
      } catch {
        // 토큰 만료 등 - 비회원으로 처리
      }
    }

    const body = await request.json();
    const { action, details } = body;

    const db = await connectToDatabase();
    await db.collection("activity_logs").insertOne({
      userId,
      userName,
      action, // "page_view", "login", "search", "ai_recommend", "schedule_generate", "review_write", "nearby_search"
      details, // { page: "home", query: "...", etc. }
      userAgent: request.headers.get("user-agent") || "",
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activity log error:", error);
    return NextResponse.json({ success: true }); // 로그 실패해도 에러 반환하지 않음
  }
}
