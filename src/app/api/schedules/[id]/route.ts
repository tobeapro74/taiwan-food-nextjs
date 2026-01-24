import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase, ObjectId } from "@/lib/mongodb";
import { JWTPayload } from "@/lib/types";

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

// GET: 특정 일정 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 일정 ID입니다." },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const schedule = await db
      .collection("saved_schedules")
      .findOne({ _id: new ObjectId(id), userId: user.userId });

    if (!schedule) {
      return NextResponse.json(
        { success: false, error: "일정을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: schedule._id.toString(),
        title: schedule.title,
        schedule: schedule.schedule,
        savedAt: schedule.savedAt,
      },
    });
  } catch (error) {
    console.error("Schedule detail error:", error);
    return NextResponse.json(
      { success: false, error: "일정 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// DELETE: 일정 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 일정 ID입니다." },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const result = await db
      .collection("saved_schedules")
      .deleteOne({ _id: new ObjectId(id), userId: user.userId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "일정을 찾을 수 없거나 삭제 권한이 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "일정이 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Schedule delete error:", error);
    return NextResponse.json(
      { success: false, error: "일정 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
