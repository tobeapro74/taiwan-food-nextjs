import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    // 입력값 검증
    if (!name || !password) {
      return NextResponse.json(
        { success: false, error: '이름과 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const membersCollection = db.collection('members');

    // 회원 찾기
    const member = await membersCollection.findOne({
      name,
      status: 'active'
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: '이름 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    const isValid = bcrypt.compareSync(password, member.password_hash || '');
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '이름 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 세션 데이터 생성 (JWT 대신 간단한 쿠키 세션)
    const sessionData = {
      id: member.id,
      name: member.name,
      email: member.email,
      profile_image: member.profile_image,
      is_admin: member.is_admin,
    };

    // 쿠키에 세션 저장 (Base64 인코딩)
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: '로그인 성공',
      data: sessionData,
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
