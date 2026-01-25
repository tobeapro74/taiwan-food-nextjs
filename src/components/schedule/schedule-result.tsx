"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Share2, RotateCcw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Save, Check, Loader2, ArrowLeft, List, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TravelSchedule,
  DaySchedule,
  ScheduleActivity,
  TIME_SLOT_ICON,
} from "@/lib/schedule-types";

interface User {
  id: number;
  name: string;
  is_admin: boolean;
}

interface ScheduleResultProps {
  schedule: TravelSchedule;
  onBack: () => void;
  onGoToSavedList?: () => void;
  user?: User | null;
}

export function ScheduleResult({ schedule, onBack, onGoToSavedList, user }: ScheduleResultProps) {
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 사진 모달 상태
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedPlaceName, setSelectedPlaceName] = useState("");

  const handlePhotoClick = (photos: string[], name: string) => {
    setSelectedPhotos(photos);
    setSelectedPlaceName(name);
    setPhotoModalOpen(true);
  };

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
        console.log("Share cancelled");
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert("일정이 클립보드에 복사되었습니다!");
      } catch (err) {
        console.error("Copy failed:", err);
      }
    }
  };

  // 저장 기능
  const handleSave = async () => {
    if (!user || isSaved) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule }),
      });

      const data = await response.json();
      if (data.success) {
        setIsSaved(true);
        alert("일정이 저장되었습니다!");
      } else {
        alert(data.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
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
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-white text-lg">
                나의 {schedule.input.days}일 일정
              </h1>
              <p className="text-white/80 text-xs">
                {schedule.input.travelers}명 · {schedule.input.ageGroup === "20s" ? "20대" : schedule.input.ageGroup === "30s" ? "30대" : "40대+"} · {new Date(schedule.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
          </div>
          {/* 저장된 일정 & 공유 버튼 */}
          <div className="flex items-center gap-2">
            {onGoToSavedList && (
              <Button
                variant="ghost"
                onClick={onGoToSavedList}
                className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <List className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleShare}
              className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
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
            onPhotoClick={handlePhotoClick}
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

        {/* 저장 버튼 (로그인 시에만) */}
        {user && (
          <button
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
              isSaved
                ? "bg-green-500 text-white"
                : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 active:scale-[0.98]"
            } disabled:opacity-70`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                저장 중...
              </>
            ) : isSaved ? (
              <>
                <Check className="w-5 h-5" />
                저장 완료
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                일정 저장하기
              </>
            )}
          </button>
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

      {/* 사진 미리보기 모달 */}
      <PhotoPreviewModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photos={selectedPhotos}
        placeName={selectedPlaceName}
      />
    </div>
  );
}

// 일차별 카드 컴포넌트
function DayCard({
  daySchedule,
  isExpanded,
  onToggle,
  onPhotoClick,
}: {
  daySchedule: DaySchedule;
  isExpanded: boolean;
  onToggle: () => void;
  onPhotoClick?: (photos: string[], name: string) => void;
}) {
  return (
    <section className="bg-white dark:bg-card rounded-2xl shadow-md overflow-hidden">
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

      {isExpanded && (
        <div className="p-4 space-y-3">
          {daySchedule.activities.map((activity, idx) => (
            <ActivityItem key={activity.id || idx} activity={activity} onPhotoClick={onPhotoClick} />
          ))}
        </div>
      )}
    </section>
  );
}

// 개별 활동 컴포넌트
function ActivityItem({ activity, onPhotoClick }: { activity: ScheduleActivity; onPhotoClick?: (photos: string[], name: string) => void }) {
  const icon = TIME_SLOT_ICON[activity.timeSlot] || "📍";
  const hasPhotos = activity.photos && activity.photos.length > 0;

  const bgColor = {
    restaurant: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/30",
    cafe: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/30",
    attraction: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/30",
    shopping: "bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-900/30",
  }[activity.type] || "bg-muted";

  const handleClick = () => {
    if (hasPhotos && onPhotoClick) {
      onPhotoClick(activity.photos!, activity.name);
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border ${bgColor} ${hasPhotos ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
      onClick={handleClick}
    >
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
            {hasPhotos && (
              <span className="text-xs text-indigo-500 flex items-center gap-0.5">
                <Camera className="w-3 h-3" />
                {activity.photos!.length}
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

// 사진 미리보기 모달 (RestaurantEditModal 패턴 적용)
function PhotoPreviewModal({
  isOpen,
  onClose,
  photos,
  placeName,
}: {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  placeName: string;
}) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // 모달이 열릴 때 body 스크롤 막기
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setSelectedIndex(null); // 모달 닫힐 때 선택 초기화
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // 키보드 네비게이션
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev));
      } else if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, photos.length]);

  if (!isOpen) return null;

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div className="relative bg-background w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pb-3 flex items-center justify-between border-b">
          <div>
            <h2 className="text-lg font-semibold">{placeName}</h2>
            <p className="text-xs text-muted-foreground">{photos.length}장의 사진</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 사진 그리드 - 스크롤 가능 */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2">
            {photos.map((photo, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-xl overflow-hidden bg-muted relative cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => !imageErrors.has(idx) && setSelectedIndex(idx)}
              >
                {!imageErrors.has(idx) ? (
                  <Image
                    src={photo}
                    alt={`${placeName} 사진 ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                    onError={() => handleImageError(idx)}
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 사진 확대 뷰 */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center animate-fade-in"
          onClick={() => setSelectedIndex(null)}
        >
          {/* 닫기 버튼 - safe area 고려 */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 mt-8 z-10 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* 사진 카운터 - safe area 고려 */}
          <div className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 mt-8 z-10 text-white/80 text-sm flex items-center h-12">
            {selectedIndex + 1} / {photos.length}
          </div>

          {/* 이전 버튼 */}
          {selectedIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-2 z-10 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </button>
          )}

          {/* 다음 버튼 */}
          {selectedIndex < photos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-2 z-10 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </button>
          )}

          {/* 확대된 사진 */}
          <div
            className="relative w-full h-full max-w-[90vw] max-h-[80vh] m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[selectedIndex]}
              alt={`${placeName} 사진 ${selectedIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              priority
              unoptimized
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
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
