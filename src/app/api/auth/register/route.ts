import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "모든 필드를 입력해주세요." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "비밀번호는 6자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const membersCollection = db.collection("members");
    const verificationCollection = db.collection("email_verifications");

    // 이메일 중복 확인
    const existingMember = await membersCollection.findOne({ email });
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "이미 사용 중인 이메일입니다." },
        { status: 400 }
      );
    }

    // 이메일 인증 여부 확인
    const verification = await verificationCollection.findOne({
      email,
      verified: true,
    });
    if (!verification) {
      return NextResponse.json(
        { success: false, error: "이메일 인증이 필요합니다." },
        { status: 400 }
      );
    }

    // 사용자 ID 생성 (auto increment 대체)
    const lastMember = await membersCollection.find().sort({ id: -1 }).limit(1).toArray();
    const newId = lastMember.length > 0 ? (lastMember[0].id || 0) + 1 : 1;

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const newMember = {
      id: newId,
      name,
      email,
      password: hashedPassword,
      profile_image: null,
      is_admin: false,
      created_at: new Date(),
    };

    await membersCollection.insertOne(newMember);

    // 인증 데이터 삭제
    await verificationCollection.deleteOne({ email });

    return NextResponse.json({
      success: true,
      data: { id: newId, name, email },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "회원가입 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
