import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { cookies } from 'next/headers';

// 리뷰 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');

    const review = await reviewsCollection.findOne({ id: parseInt(id) });

    if (!review) {
      return NextResponse.json(
        { success: false, error: '리뷰를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error) {
    console.error('리뷰 조회 오류:', error);
    return NextResponse.json(
      { success: false, error: '리뷰 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 리뷰 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 로그인 확인
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );

    const { id } = await params;
    const db = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');

    // 기존 리뷰 확인
    const existingReview = await reviewsCollection.findOne({ id: parseInt(id) });

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: '리뷰를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작성자 확인
    if (existingReview.member_id !== sessionData.id && !sessionData.is_admin) {
      return NextResponse.json(
        { success: false, error: '본인이 작성한 리뷰만 수정할 수 있습니다.' },
        { status: 403 }
      );
    }

    const updates = await request.json();

    await reviewsCollection.updateOne(
      { id: parseInt(id) },
      {
        $set: {
          ...updates,
          updated_at: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: '리뷰가 수정되었습니다.',
    });
  } catch (error) {
    console.error('리뷰 수정 오류:', error);
    return NextResponse.json(
      { success: false, error: '리뷰 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 리뷰 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 로그인 확인
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    );

    const { id } = await params;
    const db = await connectToDatabase();
    const reviewsCollection = db.collection('reviews');

    // 기존 리뷰 확인
    const existingReview = await reviewsCollection.findOne({ id: parseInt(id) });

    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: '리뷰를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 작성자 확인
    if (existingReview.member_id !== sessionData.id && !sessionData.is_admin) {
      return NextResponse.json(
        { success: false, error: '본인이 작성한 리뷰만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }

    await reviewsCollection.deleteOne({ id: parseInt(id) });

    return NextResponse.json({
      success: true,
      message: '리뷰가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('리뷰 삭제 오류:', error);
    return NextResponse.json(
      { success: false, error: '리뷰 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
