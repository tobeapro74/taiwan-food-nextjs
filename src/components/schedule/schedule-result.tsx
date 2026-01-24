"use client";

import { useState } from "react";
import { ArrowLeft, Share2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TravelSchedule,
  DaySchedule,
  ScheduleActivity,
  TIME_SLOT_ICON,
} from "@/lib/schedule-types";

interface ScheduleResultProps {
  schedule: TravelSchedule;
  onBack: () => void;
}

export function ScheduleResult({ schedule, onBack }: ScheduleResultProps) {
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);

  const toggleDay = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // 공유 기능
  const handleShare = async () => {
    const text = formatScheduleAsText(schedule);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `타이베이 ${schedule.input.days}일 여행 일정`,
          text,
        });
      } catch (err) {
        // 사용자가 취소한 경우
        console.log("Share cancelled");
      }
    } else {
      // 클립보드 복사 fallback
      try {
        await navigator.clipboard.writeText(text);
        alert("일정이 클립보드에 복사되었습니다!");
      } catch (err) {
        console.error("Copy failed:", err);
      }
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-indigo-50 to-purple-50 dark:from-background dark:to-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onBack}
              className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-white text-lg">
                나의 {schedule.input.days}일 일정
              </h1>
              <p className="text-white/80 text-xs">
                {schedule.input.travelers}명 · {schedule.input.ageGroup === "20s" ? "20대" : schedule.input.ageGroup === "30s" ? "30대" : "40대+"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleShare}
            className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 일차별 카드 */}
        {schedule.schedule.map((daySchedule) => (
          <DayCard
            key={daySchedule.day}
            daySchedule={daySchedule}
            isExpanded={expandedDays.includes(daySchedule.day)}
            onToggle={() => toggleDay(daySchedule.day)}
          />
        ))}

        {/* 여행 팁 */}
        {schedule.tips && schedule.tips.length > 0 && (
          <section className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 rounded-2xl p-5 shadow-md border border-yellow-200 dark:border-yellow-900/30">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span>💡</span> 여행 팁
            </h3>
            <ul className="space-y-2">
              {schedule.tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 예상 예산 */}
        {schedule.budget && (
          <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
            <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <span>💰</span> 예상 예산
            </h3>
            <p className="text-sm text-muted-foreground">{schedule.budget}</p>
          </section>
        )}

        {/* 다시 만들기 버튼 */}
        <button
          onClick={onBack}
          className="w-full py-4 bg-muted text-foreground font-medium rounded-2xl hover:bg-muted/80 transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          새로운 일정 만들기
        </button>
      </div>
    </div>
  );
}

// 일차별 카드 컴포넌트
function DayCard({
  daySchedule,
  isExpanded,
  onToggle,
}: {
  daySchedule: DaySchedule;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="bg-white dark:bg-card rounded-2xl shadow-md overflow-hidden">
      {/* 헤더 (클릭하면 펼침/접힘) */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold">
            {daySchedule.day}
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground">Day {daySchedule.day}</div>
            <div className="text-xs text-muted-foreground">{daySchedule.theme}</div>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* 활동 목록 */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {daySchedule.activities.map((activity, idx) => (
            <ActivityItem key={activity.id || idx} activity={activity} />
          ))}
        </div>
      )}
    </section>
  );
}

// 개별 활동 컴포넌트
function ActivityItem({ activity }: { activity: ScheduleActivity }) {
  const icon = TIME_SLOT_ICON[activity.timeSlot] || "📍";

  // 타입별 배경색
  const bgColor = {
    restaurant: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/30",
    cafe: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/30",
    attraction: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/30",
    shopping: "bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-900/30",
  }[activity.type] || "bg-muted";

  return (
    <div className={`p-4 rounded-xl border ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">{activity.timeSlotKo}</span>
            {activity.rating && (
              <span className="text-xs text-amber-500 flex items-center gap-0.5">
                ⭐ {activity.rating}
              </span>
            )}
          </div>
          <div className="font-semibold text-foreground">{activity.name}</div>
          {activity.location && (
            <div className="text-xs text-muted-foreground mt-0.5">{activity.location}</div>
          )}
          <div className="text-sm text-muted-foreground mt-2">{activity.reason}</div>
          {activity.tip && (
            <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 flex items-start gap-1">
              <span>💡</span>
              <span>{activity.tip}</span>
            </div>
          )}
          {activity.shoppingItems && activity.shoppingItems.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {activity.shoppingItems.map((item, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-white dark:bg-card px-2 py-1 rounded-full"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 일정을 텍스트로 포맷
function formatScheduleAsText(schedule: TravelSchedule): string {
  let text = `🗓️ 타이베이 ${schedule.input.days}일 여행 일정\n`;
  text += `👥 ${schedule.input.travelers}명\n\n`;

  for (const day of schedule.schedule) {
    text += `📍 Day ${day.day} - ${day.theme}\n`;
    for (const activity of day.activities) {
      text += `• ${activity.timeSlotKo}: ${activity.name}`;
      if (activity.rating) text += ` ⭐${activity.rating}`;
      text += `\n`;
      if (activity.reason) text += `  → ${activity.reason}\n`;
    }
    text += `\n`;
  }

  if (schedule.tips && schedule.tips.length > 0) {
    text += `💡 여행 팁\n`;
    for (const tip of schedule.tips) {
      text += `• ${tip}\n`;
    }
    text += `\n`;
  }

  if (schedule.budget) {
    text += `💰 예상 예산: ${schedule.budget}\n`;
  }

  text += `\n🍜 Made by 대만맛집`;

  return text;
}
