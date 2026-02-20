import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { connectToDatabase } from "@/lib/mongodb";

const resend = new Resend(process.env.RESEND_API_KEY);

// 6자리 인증 코드 생성
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "올바른 이메일 형식이 아닙니다." },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const membersCollection = db.collection("members");
    const verificationCollection = db.collection("email_verifications");

    // 이미 가입된 이메일인지 확인
    const existingMember = await membersCollection.findOne({ email });
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "이미 가입된 이메일입니다." },
        { status: 400 }
      );
    }

    // 인증 코드 생성
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후 만료

    // 기존 인증 코드 삭제 후 새로 저장
    await verificationCollection.deleteMany({ email });
    await verificationCollection.insertOne({
      email,
      code,
      expiresAt,
      verified: false,
      createdAt: new Date(),
    });

    // 이메일 발송 (커스텀 도메인: yeouido-food.com)
    const { error } = await resend.emails.send({
      from: "대만맛집 <noreply@yeouido-food.com>",
      to: email,
      subject: "[대만맛집] 이메일 인증 코드",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF5733; margin-bottom: 20px;">🍜 대만맛집 이메일 인증</h2>
          <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
            아래 인증 코드를 입력하여 회원가입을 완료해주세요.
          </p>
          <div style="background: linear-gradient(135deg, #FF8C42, #FF5733); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0;">${code}</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            • 인증 코드는 10분간 유효합니다.<br>
            • 본인이 요청하지 않았다면 이 이메일을 무시해주세요.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            대만맛집 - Taipei Food Guide
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Email send error:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { success: false, error: "이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "인증 코드가 발송되었습니다.",
    });
  } catch (error) {
    console.error("Send verification error:", error);
    return NextResponse.json(
      { success: false, error: "인증 코드 발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
