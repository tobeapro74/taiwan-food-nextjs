import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase, ObjectId } from "@/lib/mongodb";
import { JWTPayload } from "@/lib/types";
import { TravelSchedule } from "@/lib/schedule-types";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

// 사용자 인증 헬퍼
async function getAuthUser(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// GET: 사용자의 저장된 일정 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const db = await connectToDatabase();
    const schedules = await db
      .collection("saved_schedules")
      .find({ userId: user.userId })
      .sort({ savedAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: schedules.map((s) => ({
        _id: s._id.toString(),
        title: s.title,
        days: s.schedule?.input?.days || 0,
        travelers: s.schedule?.input?.travelers || 0,
        savedAt: s.savedAt,
        accommodation: s.schedule?.input?.accommodation?.district,
        ageGenderBreakdown: s.schedule?.input?.ageGenderBreakdown || [],
      })),
    });
  } catch (error) {
    console.error("Schedule list error:", error);
    return NextResponse.json(
      { success: false, error: "일정 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// POST: 일정 저장
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { schedule, title } = body as { schedule: TravelSchedule; title?: string };

    if (!schedule || !schedule.schedule) {
      return NextResponse.json(
        { success: false, error: "유효한 일정 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // 자동 제목 생성
    const autoTitle = title || `${schedule.input.days}일 타이베이 여행 (${schedule.input.travelers}명)`;

    const result = await db.collection("saved_schedules").insertOne({
      userId: user.userId,
      userName: user.name,
      title: autoTitle,
      schedule,
      savedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId.toString(),
        title: autoTitle,
      },
    });
  } catch (error) {
    console.error("Schedule save error:", error);
    return NextResponse.json(
      { success: false, error: "일정 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
