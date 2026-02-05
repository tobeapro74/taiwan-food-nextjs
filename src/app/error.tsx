'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          오류가 발생했습니다
        </h2>
        <p className="text-gray-600 mb-6">
          네트워크 연결을 확인하고 다시 시도해주세요
        </p>
        <button
          onClick={() => reset()}
          className="bg-[#FF6B6B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#ff5252] transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
