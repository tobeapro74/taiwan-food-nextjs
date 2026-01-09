import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      return NextResponse.json({
        success: false,
        error: '로그인이 필요합니다.',
      }, { status: 401 });
    }

    // 세션 데이터 디코딩
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );

    return NextResponse.json({
      success: true,
      data: sessionData,
    });
  } catch (error) {
    console.error('세션 확인 오류:', error);
    return NextResponse.json(
      { success: false, error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
