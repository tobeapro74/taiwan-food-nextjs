import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 토큰 검증
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      return NextResponse.json(
        { success: false, error: "인증이 만료되었습니다. 다시 로그인해주세요." },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    // 입력 검증
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "현재 비밀번호와 새 비밀번호를 모두 입력해주세요." },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "새 비밀번호는 6자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: "새 비밀번호는 현재 비밀번호와 달라야 합니다." },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const membersCollection = db.collection("members");

    // 사용자 조회
    const member = await membersCollection.findOne({ email: decoded.email });
    if (!member) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 카카오 전용 사용자는 비밀번호 변경 불가
    if (!member.password && member.kakao_id) {
      return NextResponse.json(
        { success: false, error: "카카오 로그인 사용자는 비밀번호를 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, member.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // 새 비밀번호 해시
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    await membersCollection.updateOne(
      { email: decoded.email },
      { $set: { password: hashedPassword, updated_at: new Date() } }
    );

    return NextResponse.json({
      success: true,
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { success: false, error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
