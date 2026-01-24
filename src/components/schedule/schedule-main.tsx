"use client";

import { useState } from "react";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ScheduleInput,
  PreferenceType,
  PurposeType,
  TravelSchedule,
  PREFERENCE_OPTIONS,
  PURPOSE_OPTIONS,
  GENDER_OPTIONS,
  AGE_GROUP_OPTIONS,
} from "@/lib/schedule-types";
import { ScheduleResult } from "./schedule-result";

interface ScheduleMainProps {
  onBack: () => void;
}

export function ScheduleMain({ onBack }: ScheduleMainProps) {
  // 입력 상태
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(2);
  const [gender, setGender] = useState<"male" | "female" | "mixed">("mixed");
  const [ageGroup, setAgeGroup] = useState<"20s" | "30s" | "40s_plus">("20s");
  const [preferences, setPreferences] = useState<PreferenceType[]>(["food", "cafe"]);
  const [purpose, setPurpose] = useState<PurposeType>("food_tour");

  // 로딩 및 결과 상태
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [schedule, setSchedule] = useState<TravelSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 취향 토글
  const togglePreference = (pref: PreferenceType) => {
    setPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  // 일정 생성
  const handleGenerate = async () => {
    if (preferences.length === 0) {
      setError("취향을 1개 이상 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep("맛집 데이터 분석 중...");

    try {
      const input: ScheduleInput = {
        days,
        travelers,
        gender,
        ageGroup,
        preferences,
        purpose,
      };

      setLoadingStep("AI가 일정을 생성 중...");

      const response = await fetch("/api/schedule-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "일정 생성에 실패했습니다.");
      }

      setLoadingStep("일정 완성!");

      // 결과 저장
      const newSchedule: TravelSchedule = {
        id: `schedule_${Date.now()}`,
        createdAt: new Date().toISOString(),
        input,
        schedule: data.data.schedule,
        tips: data.data.tips,
        budget: data.data.budget,
      };

      setSchedule(newSchedule);
    } catch (err) {
      console.error("Schedule generation error:", err);
      setError(err instanceof Error ? err.message : "일정 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 다시 만들기
  const handleReset = () => {
    setSchedule(null);
  };

  // 결과 화면
  if (schedule) {
    return <ScheduleResult schedule={schedule} onBack={handleReset} />;
  }

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-background dark:to-background">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">여행 일정을 만들고 있어요</h2>
          <p className="text-sm text-muted-foreground mb-6">{loadingStep}</p>
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  // 입력 화면
  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-background dark:to-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-white text-lg">나만의 타이베이 일정</h1>
            <p className="text-white/80 text-xs">AI가 맞춤 일정을 만들어드려요</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* 여행 일수 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>📅</span> 여행 일수
          </h2>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`w-11 h-11 rounded-xl font-medium transition-all ${
                  days === d
                    ? "bg-indigo-500 text-white shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {d}
              </button>
            ))}
            <span className="self-center text-sm text-muted-foreground ml-1">일</span>
          </div>
        </section>

        {/* 여행 인원 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>👥</span> 여행 인원
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTravelers(Math.max(1, travelers - 1))}
              className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 font-bold text-lg"
            >
              -
            </button>
            <span className="text-2xl font-bold text-foreground w-8 text-center">{travelers}</span>
            <button
              onClick={() => setTravelers(Math.min(10, travelers + 1))}
              className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 font-bold text-lg"
            >
              +
            </button>
            <span className="text-sm text-muted-foreground">명</span>
          </div>
        </section>

        {/* 성별 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>🚻</span> 성별
          </h2>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setGender(opt.id)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  gender === opt.id
                    ? "bg-indigo-500 text-white shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* 연령대 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>🎂</span> 연령대
          </h2>
          <div className="flex gap-2">
            {AGE_GROUP_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAgeGroup(opt.id)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  ageGroup === opt.id
                    ? "bg-indigo-500 text-white shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* 취향 (복수 선택) */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>💝</span> 취향 <span className="text-xs text-muted-foreground">(복수 선택)</span>
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {PREFERENCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => togglePreference(opt.id)}
                className={`py-3 px-2 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                  preferences.includes(opt.id)
                    ? "bg-indigo-500 text-white shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                <span className="text-lg">{opt.icon}</span>
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 여행 목적 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>🎯</span> 여행 목적
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {PURPOSE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPurpose(opt.id)}
                className={`py-3 px-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  purpose === opt.id
                    ? "bg-indigo-500 text-white shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                <span>{opt.icon}</span>
                <span className="text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-2xl shadow-lg hover:from-indigo-600 hover:to-purple-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5" />
          AI 일정 생성하기
        </button>

        {/* 안내 */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>AI가 대만맛집 데이터를 기반으로</p>
          <p>최적의 여행 일정을 만들어드려요</p>
        </div>
      </div>
    </div>
  );
}
