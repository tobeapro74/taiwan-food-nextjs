"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import { ChevronRight } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const stepKeys = [
  { emoji: "🍜", titleKey: "onboarding.welcome_title", descKey: "onboarding.welcome_desc", gradient: "from-primary to-primary/80" },
  { emoji: "🗺️", titleKey: "onboarding.explore_title", descKey: "onboarding.explore_desc", gradient: "from-primary/90 to-primary" },
  { emoji: "📅", titleKey: "onboarding.ai_title", descKey: "onboarding.ai_desc", gradient: "from-primary/80 to-primary/90" },
  { emoji: "🚀", titleKey: "onboarding.start_title", descKey: "onboarding.start_desc", gradient: "from-primary to-primary/90" },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isLastStep = currentStep === stepKeys.length - 1;
  const stepKey = stepKeys[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleSkip = () => {
    onComplete();
  };

  // 스와이프 제스처
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiping = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    swiping.current = false;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = Math.abs(t.clientY - touchStart.current.y);
    touchStart.current = null;

    // 수평 스와이프만 (수직 이동이 수평보다 크면 무시)
    if (dy > Math.abs(dx)) return;
    const threshold = 50;

    if (dx < -threshold) {
      // 왼쪽 스와이프 → 다음
      if (isLastStep) onComplete();
      else setCurrentStep((prev) => prev + 1);
    } else if (dx > threshold) {
      // 오른쪽 스와이프 → 이전
      if (currentStep > 0) setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, isLastStep, onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 배경 그래디언트 */}
      <div className={`absolute inset-0 bg-gradient-to-b ${stepKey.gradient} transition-all duration-500`} />

      {/* 장식 원 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 -left-20 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute top-1/3 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      </div>

      {/* Skip 버튼 */}
      {!isLastStep && (
        <button
          onClick={handleSkip}
          onTouchEnd={(e) => e.stopPropagation()}
          className="absolute right-4 z-20 text-white/70 text-sm font-medium px-4 py-2 rounded-full hover:text-white hover:bg-white/10 transition-all"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
        >
          {t("onboarding.skip")}
        </button>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <div
          key={currentStep}
          className="flex flex-col items-center text-center animate-fade-in"
        >
          <span className="text-7xl mb-8 drop-shadow-2xl">{stepKey.emoji}</span>
          <h1 className="text-2xl font-bold text-white whitespace-pre-line leading-tight mb-4 drop-shadow-md">
            {t(stepKey.titleKey)}
          </h1>
          <p className="text-white/80 text-base whitespace-pre-line leading-relaxed">
            {t(stepKey.descKey)}
          </p>
        </div>
      </div>

      {/* 하단 영역 */}
      <div className="relative z-10 px-8 pb-12 safe-area-bottom">
        {/* 인디케이터 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepKeys.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-8 bg-white"
                  : index < currentStep
                    ? "w-2 bg-white/60"
                    : "w-2 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* 버튼 */}
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-white text-gray-900 shadow-xl hover:shadow-2xl"
        >
          {isLastStep ? t("onboarding.start") : t("onboarding.next")}
          {!isLastStep && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
