'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/components/language-provider';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {t("error_page.title")}
        </h2>
        <p className="text-gray-600 mb-6">
          {t("error_page.description")}
        </p>
        <button
          onClick={() => reset()}
          className="bg-[#FF6B6B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#ff5252] transition-colors"
        >
          {t("error_page.retry")}
        </button>
      </div>
    </div>
  );
}
