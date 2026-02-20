import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const restApiKey = process.env.KAKAO_REST_API_KEY || "";
  const clientSecret = process.env.KAKAO_CLIENT_SECRET || "";
  const redirectUri = process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI || "";

  return NextResponse.json({
    rest_api_key_length: restApiKey.length,
    rest_api_key_prefix: restApiKey.slice(0, 6),
    rest_api_key_suffix: restApiKey.slice(-4),
    client_secret_length: clientSecret.length,
    client_secret_prefix: clientSecret.slice(0, 4),
    client_secret_suffix: clientSecret.slice(-4),
    client_secret_is_truthy: !!clientSecret,
    redirect_uri: redirectUri,
    node_env: process.env.NODE_ENV,
  });
}
