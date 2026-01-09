import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // 입력값 검증
    if (!name || !password) {
      return NextResponse.json(
        { success: false, error: '이름과 비밀번호는 필수입니다.' },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 20) {
      return NextResponse.json(
        { success: false, error: '이름은 2~20자 사이여야 합니다.' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 최소 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const membersCollection = db.collection('members');

    // 이름 중복 체크
    const existingMember = await membersCollection.findOne({ name });
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 이름입니다.' },
        { status: 400 }
      );
    }

    // 새 회원 ID 생성
    const maxIdDoc = await membersCollection.find({}).sort({ id: -1 }).limit(1).toArray();
    const newId = maxIdDoc.length > 0 ? (maxIdDoc[0].id || 0) + 1 : 1;

    // 비밀번호 해시
    const passwordHash = bcrypt.hashSync(password, 10);

    // 회원 등록
    const newMember = {
      id: newId,
      name,
      email: email || null,
      password_hash: passwordHash,
      profile_image: null,
      status: 'active',
      is_admin: false,
      created_at: new Date().toISOString(),
    };

    await membersCollection.insertOne(newMember);

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        id: newId,
        name,
      },
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    return NextResponse.json(
      { success: false, error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
