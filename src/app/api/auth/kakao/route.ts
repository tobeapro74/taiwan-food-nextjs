import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import type { JWTPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY!;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET!;
const KAKAO_REDIRECT_URI = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI!;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "인가 코드가 필요합니다." },
        { status: 400 }
      );
    }

    // 1단계: 인가 코드 → access_token 교환
    const tokenParams: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: KAKAO_REDIRECT_URI,
      code,
    };
    if (KAKAO_CLIENT_SECRET) {
      tokenParams.client_secret = KAKAO_CLIENT_SECRET;
    }

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenParams),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("카카오 토큰 교환 실패:", tokenData);
      console.error("사용한 redirect_uri:", KAKAO_REDIRECT_URI);
      console.error("사용한 client_id:", KAKAO_REST_API_KEY);
      return NextResponse.json(
        {
          success: false,
          error: `카카오 인증에 실패했습니다. (${tokenData.error_code || tokenData.error || "unknown"}: ${tokenData.error_description || ""})`,
        },
        { status: 401 }
      );
    }

    // 2단계: access_token으로 사용자 정보 조회
    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const kakaoUser = await userRes.json();

    if (!userRes.ok || !kakaoUser.id) {
      console.error("카카오 사용자 정보 조회 실패:", kakaoUser);
      return NextResponse.json(
        { success: false, error: "카카오 사용자 정보를 가져올 수 없습니다." },
        { status: 401 }
      );
    }

    const kakaoId = kakaoUser.id;
    const kakaoNickname =
      kakaoUser.kakao_account?.profile?.nickname || "카카오 사용자";
    const kakaoProfileImage =
      kakaoUser.kakao_account?.profile?.profile_image_url || null;
    const kakaoEmail =
      kakaoUser.kakao_account?.email?.toLowerCase() || null;

    // 3단계: DB 조회/생성
    const db = await connectToDatabase();
    const membersCollection = db.collection("members");

    // 3-a: kakao_id로 기존 사용자 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: any = await membersCollection.findOne({ kakao_id: kakaoId });

    if (!user && kakaoEmail) {
      // 3-b: 같은 이메일의 기존 계정이 있으면 kakao_id 연동
      const emailUser = await membersCollection.findOne({ email: kakaoEmail });
      if (emailUser) {
        await membersCollection.updateOne(
          { id: emailUser.id },
          {
            $set: {
              kakao_id: kakaoId,
              profile_image: emailUser.profile_image || kakaoProfileImage,
              updated_at: new Date(),
            },
          }
        );
        user = { ...emailUser, kakao_id: kakaoId };
      }
    }

    if (!user) {
      // 3-c: 신규 사용자 생성
      const lastUser = await membersCollection
        .find({})
        .sort({ id: -1 })
        .limit(1)
        .toArray();
      const newId = lastUser.length > 0 ? lastUser[0].id + 1 : 1;

      const now = new Date();
      const newUser = {
        id: newId,
        name: kakaoNickname,
        email: kakaoEmail,
        password: null,
        kakao_id: kakaoId,
        profile_image: kakaoProfileImage,
        is_admin: false,
        created_at: now,
        updated_at: now,
      };

      await membersCollection.insertOne(newUser);
      user = newUser;
    }

    // 4단계: JWT 발급
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email || "",
      name: user.name,
      is_admin: user.is_admin || false,
      profile_image: user.profile_image || null,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          profile_image: user.profile_image || null,
          is_admin: user.is_admin || false,
        },
        token,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("카카오 로그인 오류:", error);
    return NextResponse.json(
      { success: false, error: `카카오 로그인 처리 중 오류가 발생했습니다. (${error instanceof Error ? error.message : "unknown"})` },
      { status: 500 }
    );
  }
}
