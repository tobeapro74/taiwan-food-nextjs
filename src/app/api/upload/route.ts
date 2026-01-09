import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // 환경변수 체크
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary 환경변수 누락');
      return NextResponse.json(
        { success: false, error: 'Cloudinary 설정이 누락되었습니다.' },
        { status: 500 }
      );
    }

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: '이미지가 필요합니다.' },
        { status: 400 }
      );
    }

    // Base64 형식 확인
    if (!image.startsWith('data:image/')) {
      return NextResponse.json(
        { success: false, error: '올바른 이미지 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // Cloudinary에 업로드
    const result = await cloudinary.uploader.upload(image, {
      folder: 'taiwan-food-reviews',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error: unknown) {
    console.error('Cloudinary 업로드 오류:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json(
      { success: false, error: `이미지 업로드 실패: ${errorMessage}` },
      { status: 500 }
    );
  }
}
