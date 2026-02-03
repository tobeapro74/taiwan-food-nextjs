import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 표시기(N 로고) 숨기기
  devIndicators: false,

  // 이미지 최적화
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    // 이미지 포맷 최적화
    formats: ['image/avif', 'image/webp'],
    // 이미지 캐시 TTL (24시간)
    minimumCacheTTL: 86400,
    // 반응형 이미지 크기
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // 실험적 기능
  experimental: {
    // 패키지 번들 최적화
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tabs',
      '@radix-ui/react-avatar',
      '@radix-ui/react-scroll-area',
    ],
  },

  // 헤더 설정
  async headers() {
    return [
      {
        // API 라우트에 캐시 헤더 기본 설정
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
      {
        // 정적 자원에 장기 캐시
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
