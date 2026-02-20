import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

export async function POST(request: NextRequest) {
  try {
    // JWT 토큰 확인
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 토큰 검증
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const userId = decoded.userId;

    const { password } = await request.json();

    const db = await connectToDatabase();
    const membersCollection = db.collection("members");

    // 사용자 조회
    const member = await membersCollection.findOne({ id: userId });

    if (!member) {
      return NextResponse.json(
        { success: false, error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 카카오 전용 사용자가 아닌 경우 비밀번호 확인 필요
    if (member.password) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: "비밀번호를 입력해주세요." },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(password, member.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: "비밀번호가 일치하지 않습니다." },
          { status: 400 }
        );
      }
    }

    // 회원 삭제
    await membersCollection.deleteOne({ id: userId });

    // 쿠키 삭제
    const response = NextResponse.json({
      success: true,
      message: "회원탈퇴가 완료되었습니다.",
    });

    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { success: false, error: "회원탈퇴 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
