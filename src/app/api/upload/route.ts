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
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: '이미지가 필요합니다.' },
        { status: 400 }
      );
    }

    // Cloudinary에 업로드
    const result = await cloudinary.uploader.upload(image, {
      folder: 'taiwan-food-reviews',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // 최대 크기 제한
        { quality: 'auto:good' }, // 자동 품질 최적화
        { fetch_format: 'auto' }, // 자동 포맷 최적화
      ],
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Cloudinary 업로드 오류:', error);
    return NextResponse.json(
      { success: false, error: '이미지 업로드에 실패했습니다.' },
      { status: 500 }
    );
  }
}
