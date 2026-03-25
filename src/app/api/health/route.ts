import { NextRequest, NextResponse } from "next/server";

/**
 * Health Check API - 필수 환경변수 및 서비스 상태 확인
 * GET /api/health?key=admin123
 */
const ADMIN_KEY = process.env.CACHE_WARM_KEY || "admin123";

const REQUIRED_ENV_VARS = [
  { name: "CLOUDINARY_CLOUD_NAME", desc: "Cloudinary 클라우드 이름" },
  { name: "CLOUDINARY_API_KEY", desc: "Cloudinary API 키" },
  { name: "CLOUDINARY_API_SECRET", desc: "Cloudinary API 시크릿" },
  { name: "NEXT_PUBLIC_GOOGLE_PLACES_API_KEY", desc: "Google Places API 키" },
  { name: "MONGODB_URI", desc: "MongoDB 연결 URI" },
  { name: "JWT_SECRET", desc: "JWT 시크릿 키" },
];

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = REQUIRED_ENV_VARS.map((env) => ({
    name: env.name,
    desc: env.desc,
    set: !!process.env[env.name],
  }));

  const missing = results.filter((r) => !r.set);
  const allSet = missing.length === 0;

  return NextResponse.json({
    status: allSet ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    envVars: {
      total: results.length,
      set: results.filter((r) => r.set).length,
      missing: missing.map((m) => `${m.name} (${m.desc})`),
    },
    results,
  });
}
