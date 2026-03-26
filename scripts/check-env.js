/**
 * 빌드 전 필수 환경변수 검증 스크립트
 * Vercel 배포 시 빌드 단계에서 실행되어, 환경변수가 없으면 빌드를 실패시킴
 */

const REQUIRED = [
  "NEXT_PUBLIC_GOOGLE_PLACES_API_KEY",
  "MONGODB_URI",
];

// Cloudinary: CLOUDINARY_URL 또는 개별 변수 중 하나만 있으면 OK
const hasCloudinary =
  process.env.CLOUDINARY_URL ||
  (process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);

const missing = REQUIRED.filter((key) => !process.env[key]);

if (!hasCloudinary) {
  missing.push("CLOUDINARY_URL (또는 CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET)");
}

if (missing.length > 0) {
  console.error("\n❌ 필수 환경변수가 설정되지 않았습니다:\n");
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error("\nVercel Dashboard > Settings > Environment Variables에서 추가해주세요.\n");
  process.exit(1);
} else {
  console.log("✅ 모든 필수 환경변수가 설정되어 있습니다.");
}
