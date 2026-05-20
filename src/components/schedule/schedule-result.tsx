"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { Share2, RotateCcw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Save, Check, Loader2, ArrowLeft, List, X, Camera, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TravelSchedule,
  DaySchedule,
  ScheduleActivity,
  TIME_SLOT_ICON,
  AgeGenderCount,
} from "@/lib/schedule-types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLanguage } from "@/components/language-provider";

function formatAgeGenderSummary(breakdown?: AgeGenderCount[], totalFallback?: number, t?: (key: string, params?: Record<string, string | number>) => string): string {
  if (!breakdown || breakdown.length === 0) {
    return t ? t("schedule.count_suffix", { count: totalFallback || 0 }) : `${totalFallback || 0}`;
  }
  const AGE_KEY_MAP: Record<string, string> = {
    "10s": "schedule.age_10s", "20s": "schedule.age_20s", "30s": "schedule.age_30s",
    "40s": "schedule.age_40s", "50s": "schedule.age_50s", "60s_plus": "schedule.age_60s",
  };
  const parts: string[] = [];
  for (const g of breakdown) {
    const label = t ? t(AGE_KEY_MAP[g.ageGroup] || g.ageGroup) : g.ageGroup;
    if (g.male > 0) parts.push(t ? t("schedule.age_summary_male", { label, count: g.male }) : `${label}M(${g.male})`);
    if (g.female > 0) parts.push(t ? t("schedule.age_summary_female", { label, count: g.female }) : `${label}F(${g.female})`);
  }
  return parts.length > 0 ? parts.join("+") : (t ? t("schedule.count_suffix", { count: totalFallback || 0 }) : `${totalFallback || 0}`);
}

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
  initialSaved?: boolean;
}

// AI 생성 콘텐츠의 언어를 감지 (한글 포함 여부로 판단)
function detectContentLanguage(schedule: TravelSchedule): string {
  const firstTheme = schedule.schedule?.[0]?.theme;
  if (!firstTheme) return "ko";
  // 한글이 포함되어 있으면 한국어, 아니면 영어
  return /[가-힣]/.test(firstTheme) ? "ko" : "en";
}

export function ScheduleResult({ schedule, onBack, onGoToSavedList, user, initialSaved = false }: ScheduleResultProps) {
  const { t, language } = useLanguage();
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(initialSaved);

  // 일정 콘텐츠 언어: generatedLanguage가 있으면 사용, 없으면 콘텐츠에서 감지
  const contentLanguage = schedule.generatedLanguage || detectContentLanguage(schedule);
  const isLanguageMismatch = contentLanguage !== language;

  // 확인 다이얼로그 상태
  const [confirmAction, setConfirmAction] = useState<"back" | "list" | null>(null);

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
    const text = formatScheduleAsText(schedule, t);

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("schedule.share_title", { days: schedule.input.days }),
          text,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("schedule.copied"));
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
        body: JSON.stringify({ schedule, language }),
      });

      const data = await response.json();
      if (data.success) {
        setIsSaved(true);
        toast.success(t("schedule.save_success"));
      } else {
        toast.error(data.error || t("schedule.save_failed"));
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error(t("schedule.save_failed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-primary/5 to-background dark:from-background dark:to-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/85 shadow-lg safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                if (!isSaved) {
                  setConfirmAction("back");
                  return;
                }
                onBack();
              }}
              className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-white text-lg">
                {t("schedule.my_schedule", { days: schedule.input.days })}
              </h1>
              <p className="text-white/80 text-xs">
                {formatAgeGenderSummary(schedule.input.ageGenderBreakdown, schedule.input.travelers, t)} · {new Date(schedule.createdAt).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US")}
              </p>
            </div>
          </div>
          {/* 저장된 일정 & 공유 버튼 */}
          <div className="flex items-center gap-2">
            {onGoToSavedList && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (!isSaved) {
                    setConfirmAction("list");
                    return;
                  }
                  onGoToSavedList();
                }}
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
        {/* AI 생성 언어 안내 */}
        {isLanguageMismatch && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t("schedule.language_mismatch_notice")}
            </p>
          </div>
        )}

        {/* 일차별 카드 */}
        {schedule.schedule.map((daySchedule) => (
          <DayCard
            key={daySchedule.day}
            daySchedule={daySchedule}
            isExpanded={expandedDays.includes(daySchedule.day)}
            onToggle={() => toggleDay(daySchedule.day)}
            onPhotoClick={handlePhotoClick}
            t={t}
          />
        ))}

        {/* 여행 팁 */}
        {schedule.tips && schedule.tips.length > 0 && (
          <section className="bg-accent/5 dark:bg-accent/10 rounded-2xl p-5 shadow-md border border-accent/10 dark:border-accent/20">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span>💡</span> {t("schedule.travel_tips")}
            </h3>
            <ul className="space-y-2">
              {schedule.tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-accent">•</span>
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
              <span>💰</span> {t("schedule.budget")}
            </h3>
            <p className="text-sm text-muted-foreground">{schedule.budget}</p>
          </section>
        )}

        {/* 저장 버튼 (새로 생성한 일정 + 로그인 시에만) */}
        {user && !initialSaved && (
          <button
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
              isSaved
                ? "bg-primary text-white"
                : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
            } disabled:opacity-70`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t("schedule.saving")}
              </>
            ) : isSaved ? (
              <>
                <Check className="w-5 h-5" />
                {t("schedule.saved")}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {t("schedule.save_button")}
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
          {t("schedule.new_schedule")}
        </button>
      </div>

      {/* 사진 미리보기 모달 */}
      <PhotoPreviewModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        photos={selectedPhotos}
        placeName={selectedPlaceName}
        t={t}
      />

      {/* 저장 전 이탈 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={t("schedule.unsaved_warning")}
        description={confirmAction === "back"
          ? t("schedule.back_warning")
          : t("schedule.list_warning")}
        onConfirm={() => {
          if (confirmAction === "back") {
            onBack();
          } else if (confirmAction === "list" && onGoToSavedList) {
            onGoToSavedList();
          }
        }}
      />
    </div>
  );
}

// 일차별 카드 컴포넌트
// timeSlot → i18n 키 매핑
const TIMESLOT_I18N_KEY: Record<string, string> = {
  morning: "schedule.timeslot_morning",
  lunch: "schedule.timeslot_lunch",
  afternoon: "schedule.timeslot_afternoon",
  dinner: "schedule.timeslot_dinner",
  night: "schedule.timeslot_night",
};

function DayCard({
  daySchedule,
  isExpanded,
  onToggle,
  onPhotoClick,
  t,
}: {
  daySchedule: DaySchedule;
  isExpanded: boolean;
  onToggle: () => void;
  onPhotoClick?: (photos: string[], name: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <section className="bg-white dark:bg-card rounded-2xl shadow-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/15 dark:to-primary/10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
            {daySchedule.day}
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground">{t("schedule.day_label", { day: daySchedule.day })}</div>
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
            <div key={activity.id || idx}>
              {/* 이동 정보 */}
              {activity.travelFromPrev && (
                <div className="flex items-center gap-2 py-2 px-3 mb-2">
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-3 bg-primary/30" />
                    <div className="text-sm">
                      {activity.travelFromPrev.method === "도보" || activity.travelFromPrev.method === "Walk" ? "🚶" :
                       activity.travelFromPrev.method === "MRT" || activity.travelFromPrev.method.includes("MRT") ? "🚇" :
                       activity.travelFromPrev.method === "버스" || activity.travelFromPrev.method === "Bus" ? "🚌" :
                       activity.travelFromPrev.method === "택시" || activity.travelFromPrev.method === "Taxi" ? "🚕" : "🚶"}
                    </div>
                    <div className="w-0.5 h-3 bg-primary/30" />
                  </div>
                  <div className="flex-1 bg-primary/5 dark:bg-primary/10 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-medium text-primary">{activity.travelFromPrev.method}</span>
                      <span className="text-xs text-muted-foreground">{activity.travelFromPrev.duration}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{activity.travelFromPrev.description}</p>
                  </div>
                </div>
              )}
              <ActivityItem activity={activity} onPhotoClick={onPhotoClick} t={t} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// 개별 활동 컴포넌트
function ActivityItem({ activity, onPhotoClick, t }: { activity: ScheduleActivity; onPhotoClick?: (photos: string[], name: string) => void; t: (key: string, params?: Record<string, string | number>) => string }) {
  const icon = TIME_SLOT_ICON[activity.timeSlot] || "📍";
  const hasPhotos = activity.photos && activity.photos.length > 0;

  const bgColor = {
    restaurant: "bg-muted/50 border-border/40",
    cafe: "bg-muted/50 border-border/40",
    attraction: "bg-muted/50 border-border/40",
    shopping: "bg-muted/50 border-border/40",
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
            <span className="text-xs text-muted-foreground">{t(TIMESLOT_I18N_KEY[activity.timeSlot] || "schedule.timeslot_morning")}</span>
            {activity.rating && (
              <span className="text-xs text-accent flex items-center gap-0.5">
                ⭐ {activity.rating}
              </span>
            )}
            {hasPhotos && (
              <span className="text-xs text-primary flex items-center gap-0.5">
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
            <div className="text-xs text-primary mt-2 flex items-start gap-1">
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
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  placeName: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [resolvedPhotos, setResolvedPhotos] = useState<string[]>(photos);

  // photo_reference URL이면 place-photo API로 실제 이미지 URL 획득
  useEffect(() => {
    if (!isOpen) return;
    const isPhotoRef = photos.some(p => p.includes("photo_reference="));
    if (!isPhotoRef) {
      setResolvedPhotos(photos);
      return;
    }
    // place-photo API로 대표 사진 1장 가져오기
    fetch(`/api/place-photo?query=${encodeURIComponent(placeName)}&name=${encodeURIComponent(placeName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.photoUrl) setResolvedPhotos([data.photoUrl]);
      })
      .catch(() => {});
  }, [isOpen, photos, placeName]);

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
        setSelectedIndex((prev) => (prev !== null && prev < resolvedPhotos.length - 1 ? prev + 1 : prev));
      } else if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, resolvedPhotos.length]);

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
    if (selectedIndex !== null && selectedIndex < resolvedPhotos.length - 1) {
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
            <p className="text-xs text-muted-foreground">{t("schedule.photos", { count: resolvedPhotos.length })}</p>
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
            {resolvedPhotos.map((photo, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-xl overflow-hidden bg-muted relative cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => !imageErrors.has(idx) && setSelectedIndex(idx)}
              >
                {!imageErrors.has(idx) ? (
                  <Image
                    src={photo}
                    alt={t("schedule.photo_alt", { name: placeName, index: idx + 1 })}
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
            {selectedIndex + 1} / {resolvedPhotos.length}
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
          {selectedIndex < resolvedPhotos.length - 1 && (
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
              src={resolvedPhotos[selectedIndex]}
              alt={t("schedule.photo_alt", { name: placeName, index: selectedIndex + 1 })}
              fill
              className="object-contain"
              sizes="90vw"
              priority
              unoptimized
            />
          </div>
        </div>
      )}

    </div>
  );
}

// 일정을 텍스트로 포맷
function formatScheduleAsText(schedule: TravelSchedule, t: (key: string, params?: Record<string, string | number>) => string): string {
  let text = `🗓️ ${t("schedule.title", { days: schedule.input.days })}\n`;
  text += `👥 ${t("schedule.people", { count: schedule.input.travelers })}\n\n`;

  for (const day of schedule.schedule) {
    text += `📍 ${t("schedule.day_label", { day: day.day })} - ${day.theme}\n`;
    for (const activity of day.activities) {
      text += `• ${t(TIMESLOT_I18N_KEY[activity.timeSlot] || "schedule.timeslot_morning")}: ${activity.name}`;
      if (activity.rating) text += ` ⭐${activity.rating}`;
      text += `\n`;
      if (activity.reason) text += `  → ${activity.reason}\n`;
    }
    text += `\n`;
  }

  if (schedule.tips && schedule.tips.length > 0) {
    text += `💡 ${t("schedule.travel_tips")}\n`;
    for (const tip of schedule.tips) {
      text += `• ${tip}\n`;
    }
    text += `\n`;
  }

  if (schedule.budget) {
    text += `💰 ${t("schedule.budget")}: ${schedule.budget}\n`;
  }

  text += `\n🍜 ${t("schedule.made_by")}`;

  return text;
}
