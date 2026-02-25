"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Loader2, Minus, Plus, Plane, Users, Hotel, MapPin, LogIn, List, Trash2, Calendar, Search, CheckCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  ScheduleInput,
  PreferenceType,
  PurposeType,
  TravelSchedule,
  AgeGenderCount,
  AgeGroupType,
  FlightTimeType,
  AccommodationInfo,
  PREFERENCE_OPTIONS,
  PURPOSE_OPTIONS,
  DETAILED_AGE_OPTIONS,
  FLIGHT_TIME_OPTIONS,
  TAIPEI_DISTRICT_OPTIONS,
} from "@/lib/schedule-types";
import { ScheduleResult } from "./schedule-result";
import { useLanguage } from "@/components/language-provider";

interface User {
  id: number;
  name: string;
  is_admin: boolean;
}

interface SavedScheduleItem {
  _id: string;
  title: string;
  days: number;
  travelers: number;
  savedAt: string;
  accommodation?: string;
  accommodationDistrictId?: string;
  ageGenderBreakdown?: AgeGenderCount[];
}

interface ScheduleMainProps {
  onBack: () => void;
  user?: User | null;
  onLoginClick?: () => void;
  initialViewMode?: "create" | "list";
}

// 초기 연령대별 인원 상태
const initialAgeGenderCounts: AgeGenderCount[] = DETAILED_AGE_OPTIONS.map((opt) => ({
  ageGroup: opt.id,
  male: 0,
  female: 0,
}));

export function ScheduleMain({ onBack, user, onLoginClick, initialViewMode = "create" }: ScheduleMainProps) {
  const { t, language } = useLanguage();

  // 뷰 모드: "create" | "list" | "view"
  const [viewMode, setViewMode] = useState<"create" | "list" | "view">(initialViewMode);

  // 초기 로딩 상태 (저장된 일정 확인 중)
  const [isInitializing, setIsInitializing] = useState(true);

  // 저장된 일정 목록
  const [savedSchedules, setSavedSchedules] = useState<SavedScheduleItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [viewingSchedule, setViewingSchedule] = useState<TravelSchedule | null>(null);

  // 여행 일수
  const [days, setDays] = useState(3);

  // 입국/출국 시간대
  const [arrivalTime, setArrivalTime] = useState<FlightTimeType>("morning");
  const [departureTime, setDepartureTime] = useState<FlightTimeType>("afternoon");

  // 연령대별 인원
  const [ageGenderCounts, setAgeGenderCounts] = useState<AgeGenderCount[]>(initialAgeGenderCounts);

  // 숙소 정보
  const [accommodationName, setAccommodationName] = useState("");
  const [accommodationDistrict, setAccommodationDistrict] = useState("");
  const [hotelSearchResults, setHotelSearchResults] = useState<Array<{
    name: string;
    address: string;
    districtId: string;
    districtLabel: string;
    lat?: number;
    lng?: number;
  }>>([]);
  const [isSearchingHotel, setIsSearchingHotel] = useState(false);
  const [showHotelResults, setShowHotelResults] = useState(false);
  const [selectedHotelAddress, setSelectedHotelAddress] = useState("");

  // 취향 및 목적
  const [preferences, setPreferences] = useState<PreferenceType[]>(["food", "cafe"]);
  const [purposes, setPurposes] = useState<PurposeType[]>(["food_tour"]);

  // 로딩 및 결과 상태
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [schedule, setSchedule] = useState<TravelSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 확인 다이얼로그 상태
  const [confirmNavOpen, setConfirmNavOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 총 인원 계산
  const totalTravelers = useMemo(() => {
    return ageGenderCounts.reduce((sum, item) => sum + item.male + item.female, 0);
  }, [ageGenderCounts]);

  // 총 남성/여성 수 계산
  const totalMale = useMemo(() => ageGenderCounts.reduce((sum, item) => sum + item.male, 0), [ageGenderCounts]);
  const totalFemale = useMemo(() => ageGenderCounts.reduce((sum, item) => sum + item.female, 0), [ageGenderCounts]);

  // 성별 자동 계산
  const computedGender = useMemo((): "male" | "female" | "mixed" => {
    if (totalMale > 0 && totalFemale === 0) return "male";
    if (totalFemale > 0 && totalMale === 0) return "female";
    return "mixed";
  }, [totalMale, totalFemale]);

  // 대표 연령대 자동 계산 (가장 인원이 많은 연령대)
  const computedAgeGroup = useMemo((): "20s" | "30s" | "40s_plus" => {
    const youngCount = ageGenderCounts
      .filter((c) => c.ageGroup === "10s" || c.ageGroup === "20s")
      .reduce((sum, c) => sum + c.male + c.female, 0);
    const middleCount = ageGenderCounts
      .filter((c) => c.ageGroup === "30s")
      .reduce((sum, c) => sum + c.male + c.female, 0);
    const seniorCount = ageGenderCounts
      .filter((c) => c.ageGroup === "40s" || c.ageGroup === "50s" || c.ageGroup === "60s_plus")
      .reduce((sum, c) => sum + c.male + c.female, 0);

    if (seniorCount >= youngCount && seniorCount >= middleCount) return "40s_plus";
    if (middleCount >= youngCount) return "30s";
    return "20s";
  }, [ageGenderCounts]);

  // 인원이 있는 연령대만 필터링
  const activeAgeGroups = useMemo(() => {
    return ageGenderCounts.filter((c) => c.male > 0 || c.female > 0);
  }, [ageGenderCounts]);

  // 인원 수 변경
  const updateCount = (ageGroup: AgeGroupType, gender: "male" | "female", delta: number) => {
    setAgeGenderCounts((prev) =>
      prev.map((item) => {
        if (item.ageGroup === ageGroup) {
          const newCount = Math.max(0, Math.min(10, item[gender] + delta));
          return { ...item, [gender]: newCount };
        }
        return item;
      })
    );
  };

  // 숙소 검색
  const searchHotel = async () => {
    if (!accommodationName || accommodationName.trim().length < 2) {
      return;
    }

    setIsSearchingHotel(true);
    setShowHotelResults(false);

    try {
      const response = await fetch("/api/hotel-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: accommodationName }),
      });
      const data = await response.json();

      if (data.success && data.results?.length > 0) {
        setHotelSearchResults(data.results);
        setShowHotelResults(true);
      } else {
        setHotelSearchResults([]);
        setShowHotelResults(true);
      }
    } catch (error) {
      console.error("Hotel search error:", error);
      setHotelSearchResults([]);
    } finally {
      setIsSearchingHotel(false);
    }
  };

  // 숙소 선택
  const selectHotel = (hotel: typeof hotelSearchResults[0]) => {
    setAccommodationName(hotel.name);
    setAccommodationDistrict(hotel.districtId);
    setSelectedHotelAddress(hotel.address);
    setShowHotelResults(false);
  };

  // 취향 토글
  const togglePreference = (pref: PreferenceType) => {
    setPreferences((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  // 여행 목적 토글
  const togglePurpose = (p: PurposeType) => {
    setPurposes((prev) =>
      prev.includes(p) ? prev.filter((v) => v !== p) : [...prev, p]
    );
  };

  // 저장된 일정 목록 불러오기
  const loadSavedSchedules = async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const response = await fetch("/api/schedules");
      const data = await response.json();
      if (data.success) {
        setSavedSchedules(data.data);
      }
    } catch (error) {
      console.error("Failed to load saved schedules:", error);
    } finally {
      setLoadingSaved(false);
    }
  };

  // 마운트 시 저장된 일정 확인 후 초기 화면 결정
  useEffect(() => {
    const initializeView = async () => {
      if (!user) {
        setIsInitializing(false);
        return;
      }

      try {
        const response = await fetch("/api/schedules");
        const data = await response.json();
        if (data.success) {
          setSavedSchedules(data.data);
          // 저장된 일정이 있으면 list, 없으면 create
          if (data.data.length > 0) {
            setViewMode("list");
          } else {
            setViewMode("create");
          }
        }
      } catch (error) {
        console.error("Failed to check saved schedules:", error);
        setViewMode("create");
      } finally {
        setIsInitializing(false);
      }
    };

    initializeView();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 저장된 일정 상세 보기
  const viewSavedSchedule = async (id: string) => {
    setSelectedScheduleId(id);
    setLoadingSaved(true);
    try {
      const response = await fetch(`/api/schedules/${id}`);
      const data = await response.json();
      if (data.success && data.data?.schedule) {
        setViewingSchedule(data.data.schedule);
        setViewMode("view");
      } else {
        toast.error(data.error || t("schedule.load_schedule_failed"));
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
      toast.error(t("schedule.load_schedule_failed"));
    } finally {
      setLoadingSaved(false);
    }
  };

  // 저장된 일정 삭제
  const deleteSavedSchedule = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setSavedSchedules((prev) => prev.filter((s) => s._id !== id));
        toast.success(t("schedule.delete_success"));
      } else {
        toast.error(data.error || t("schedule.delete_failed"));
      }
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast.error(t("schedule.delete_failed"));
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // 목록 보기로 전환
  const showSavedList = () => {
    // 일정 작성 중(인원 입력됨)이면 확인 다이얼로그
    if (viewMode === "create" && totalTravelers > 0) {
      setConfirmNavOpen(true);
      return;
    }
    loadSavedSchedules();
    setViewMode("list");
  };

  // 일정 생성
  const handleGenerate = async () => {
    if (totalTravelers === 0) {
      setError(t("schedule.error_no_travelers"));
      return;
    }
    if (preferences.length === 0) {
      setError(t("schedule.error_no_preferences"));
      return;
    }
    if (purposes.length === 0) {
      setError(t("schedule.error_no_purposes"));
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(t("schedule.loading_analyzing"));

    try {
      // 숙소 정보 구성
      const accommodation: AccommodationInfo | undefined = accommodationDistrict ? {
        name: accommodationName || undefined,
        district: TAIPEI_DISTRICT_OPTIONS.find(d => d.id === accommodationDistrict)?.label,
        districtId: accommodationDistrict,
      } : undefined;

      const input: ScheduleInput = {
        days,
        travelers: totalTravelers,
        gender: computedGender,
        ageGroup: computedAgeGroup,
        preferences,
        purposes,
        ageGenderBreakdown: activeAgeGroups,
        arrivalTime,
        departureTime,
        accommodation,
      };

      setLoadingStep(t("schedule.loading_generating"));

      const response = await fetch("/api/schedule-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, language }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || t("schedule.loading_error"));
      }

      setLoadingStep(t("schedule.loading_complete"));

      const newSchedule: TravelSchedule = {
        id: `schedule_${Date.now()}`,
        createdAt: new Date().toISOString(),
        input,
        schedule: data.data.schedule,
        tips: data.data.tips,
        budget: data.data.budget,
        generatedLanguage: language,
      };

      setSchedule(newSchedule);
    } catch (err) {
      console.error("Schedule generation error:", err);
      setError(err instanceof Error ? err.message : t("schedule.loading_generic_error"));
    } finally {
      setIsLoading(false);
    }
  };

  // 다시 만들기
  const handleReset = () => {
    setSchedule(null);
    setViewMode("create");
    setViewingSchedule(null);
    setSelectedScheduleId(null);
  };

  // 로그인 필요 화면
  if (!user) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-b from-primary/5 to-background dark:from-background dark:to-background">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/85 shadow-lg safe-area-top">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-white text-lg">{t("schedule.header_title")}</h1>
              <p className="text-white/80 text-xs">{t("schedule.header_subtitle")}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary/85 rounded-full flex items-center justify-center mb-6">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t("schedule.login_required_title")}</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center whitespace-pre-line">
            {t("schedule.login_required_desc")}
          </p>
          <Button
            onClick={onLoginClick}
            className="bg-gradient-to-r from-primary to-primary/85 text-white px-8 py-3 rounded-xl"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {t("schedule.login_signup")}
          </Button>
        </div>
      </div>
    );
  }

  // 초기화 중 로딩 화면
  if (isInitializing) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-b from-primary/5 to-background dark:from-background dark:to-background">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">{t("schedule.loading_schedules")}</p>
        </div>
      </div>
    );
  }

  // 저장된 일정 보기 화면
  if (viewMode === "view" && viewingSchedule) {
    const handleBackToList = () => {
      setViewingSchedule(null);
      setSelectedScheduleId(null);
      setViewMode("list");
    };
    return <ScheduleResult schedule={viewingSchedule} onBack={handleBackToList} onGoToSavedList={showSavedList} user={user} initialSaved />;
  }

  // 저장된 일정 목록 화면
  if (viewMode === "list") {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-b from-primary/5 to-background dark:from-background dark:to-background">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/85 shadow-lg safe-area-top">
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
                <h1 className="font-bold text-white text-lg">{t("schedule.saved_schedules")}</h1>
                <p className="text-white/80 text-xs">{t("schedule.schedule_count", { count: savedSchedules.length })}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setViewMode("create")}
              className="h-11 px-4 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t("schedule.create_schedule")}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loadingSaved ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : savedSchedules.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("schedule.no_saved_schedules")}</p>
              <Button
                onClick={() => setViewMode("create")}
                className="mt-4 bg-primary text-white"
              >
                {t("schedule.create_new_schedule")}
              </Button>
            </div>
          ) : (
            savedSchedules.map((item) => (
              <div
                key={item._id}
                className="bg-white dark:bg-card rounded-xl p-4 shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => viewSavedSchedule(item._id)}
                  >
                    <h3 className="font-semibold text-foreground">
                      {item.days && item.travelers
                        ? t("schedule.schedule_list_title", { days: item.days, travelers: item.travelers })
                        : item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("schedule.days_with_unit", { days: item.days })} · {formatAgeGenderSummary(item.ageGenderBreakdown, item.travelers, t)}
                      {item.accommodation && ` · ${
                        language === "en" && item.accommodationDistrictId
                          ? (TAIPEI_DISTRICT_OPTIONS.find(d => d.id === item.accommodationDistrictId)?.labelEn || item.accommodation)
                          : item.accommodation
                      }`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.savedAt).toLocaleDateString(language === "ko" ? "ko-KR" : "en-US")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSavedSchedule(item._id)}
                    className="text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 일정 삭제 확인 다이얼로그 */}
        <ConfirmDialog
          open={confirmDeleteId !== null}
          onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
          title={t("schedule.delete_schedule_title")}
          description={t("schedule.delete_schedule_desc")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          variant="destructive"
          onConfirm={() => {
            if (confirmDeleteId) executeDelete(confirmDeleteId);
          }}
        />
      </div>
    );
  }

  // 결과 화면
  if (schedule) {
    return <ScheduleResult schedule={schedule} onBack={handleReset} onGoToSavedList={showSavedList} user={user} />;
  }

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 bg-gradient-to-b from-primary/5 to-background dark:from-background dark:to-background">
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary/85 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t("schedule.loading_title")}</h2>
          <p className="text-sm text-muted-foreground mb-6">{loadingStep}</p>
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // 입력 화면
  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-primary/5 to-background dark:from-background dark:to-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/85 shadow-lg safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-white text-lg">{t("schedule.header_title")}</h1>
            <p className="text-white/80 text-xs">{t("schedule.header_subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-destructive/10 dark:bg-destructive/20 text-destructive p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* 여행 일수 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>📅</span> {t("schedule.days_label")}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setDays(Math.max(1, days - 1))}
              className="w-12 h-12 rounded-full bg-muted hover:bg-muted/80 font-bold text-xl flex items-center justify-center"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-4xl font-bold text-primary">{days}</span>
              <span className="text-lg text-muted-foreground ml-1">{t("schedule.days_unit")}</span>
            </div>
            <button
              onClick={() => setDays(Math.min(14, days + 1))}
              className="w-12 h-12 rounded-full bg-muted hover:bg-muted/80 font-bold text-xl flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* 입국/출국 시간 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plane className="w-4 h-4" /> {t("schedule.flight_time")}
          </h2>

          {/* 입국 시간 */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">{t("schedule.arrival_label")}</p>
            <div className="flex flex-wrap gap-2">
              {FLIGHT_TIME_OPTIONS.map((opt) => (
                <button
                  key={`arrival-${opt.id}`}
                  onClick={() => setArrivalTime(opt.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    arrivalTime === opt.id
                      ? "bg-primary text-white shadow-md"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div>{t(opt.labelKey)}</div>
                  <div className="text-[10px] opacity-70">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 출국 시간 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t("schedule.departure_label", { day: days })}</p>
            <div className="flex flex-wrap gap-2">
              {FLIGHT_TIME_OPTIONS.map((opt) => (
                <button
                  key={`departure-${opt.id}`}
                  onClick={() => setDepartureTime(opt.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    departureTime === opt.id
                      ? "bg-primary text-white shadow-md"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div>{t(opt.labelKey)}</div>
                  <div className="text-[10px] opacity-70">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 숙소 위치 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Hotel className="w-4 h-4" /> {t("schedule.accommodation_title")}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">{t("schedule.accommodation_desc")}</p>

          {/* 숙소명 검색 */}
          <div className="mb-4 relative">
            <label className="text-xs text-muted-foreground mb-1 block">{t("schedule.hotel_search_label")}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={accommodationName}
                onChange={(e) => {
                  setAccommodationName(e.target.value);
                  setShowHotelResults(false);
                  setSelectedHotelAddress("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchHotel();
                  }
                }}
                placeholder={t("schedule.hotel_search_placeholder")}
                className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={searchHotel}
                disabled={isSearchingHotel || accommodationName.trim().length < 2}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isSearchingHotel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {t("common.search")}
              </button>
            </div>

            {/* 검색 결과 드롭다운 */}
            {showHotelResults && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {hotelSearchResults.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    {t("schedule.no_search_results")}
                  </div>
                ) : (
                  hotelSearchResults.map((hotel, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectHotel(hotel)}
                      className="w-full p-3 text-left hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-sm text-foreground">{hotel.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{hotel.address}</div>
                      <div className="text-xs text-primary mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {t("schedule.district_area", { district: hotel.districtLabel })}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 선택된 숙소 정보 표시 */}
          {selectedHotelAddress && (
            <div className="mb-4 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">{accommodationName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{selectedHotelAddress}</div>
                </div>
              </div>
            </div>
          )}

          {/* 지역 선택 (직접 선택 또는 검색 결과로 자동 선택) */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {t("schedule.district_label")} {selectedHotelAddress ? t("schedule.district_auto") : t("schedule.district_manual")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TAIPEI_DISTRICT_OPTIONS.map((district) => (
                <button
                  key={district.id}
                  onClick={() => {
                    setAccommodationDistrict(district.id);
                    if (!selectedHotelAddress) {
                      setAccommodationName("");
                    }
                  }}
                  className={`p-2 rounded-lg text-xs font-medium transition-all text-left ${
                    accommodationDistrict === district.id
                      ? "bg-primary text-white shadow-md"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div className="font-semibold">{t(district.labelKey)}</div>
                  <div className="text-[10px] opacity-70 truncate">{t(district.descKey)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 지역 인근 명소 표시 */}
          {accommodationDistrict && accommodationDistrict !== "other" && (
            <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg">
              <p className="text-xs text-primary">
                📍 {t("schedule.nearby_attractions")}: {(() => {
                  const district = TAIPEI_DISTRICT_OPTIONS.find(d => d.id === accommodationDistrict);
                  return language === "en"
                    ? district?.nearbyAttractionsEn.join(", ")
                    : district?.nearbyAttractions.join(", ");
                })()}
              </p>
            </div>
          )}
        </section>

        {/* 여행 인원 (연령대별) */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> {t("schedule.travelers_title")}
          </h2>
          <p className="text-xs text-muted-foreground mb-4">{t("schedule.travelers_desc")}</p>

          {/* 인원 입력 테이블 */}
          <div className="space-y-2">
            {/* 헤더 */}
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs text-muted-foreground text-center pb-1 border-b">
              <div className="text-left">{t("schedule.age_group_header")}</div>
              <div>{t("schedule.male_header")}</div>
              <div>{t("schedule.female_header")}</div>
            </div>

            {/* 연령대별 입력 */}
            {DETAILED_AGE_OPTIONS.map((opt) => {
              const count = ageGenderCounts.find((c) => c.ageGroup === opt.id)!;
              return (
                <div key={opt.id} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center py-1">
                  <div className="text-sm font-medium">{t(opt.labelKey)}</div>

                  {/* 남성 카운터 */}
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => updateCount(opt.id, "male", -1)}
                      className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center text-sm font-bold"
                      disabled={count.male === 0}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-medium">{count.male}</span>
                    <button
                      onClick={() => updateCount(opt.id, "male", 1)}
                      className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center text-sm font-bold"
                    >
                      +
                    </button>
                  </div>

                  {/* 여성 카운터 */}
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => updateCount(opt.id, "female", -1)}
                      className="w-7 h-7 rounded-full bg-accent/10 dark:bg-accent/20 text-accent-foreground flex items-center justify-center text-sm font-bold"
                      disabled={count.female === 0}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-medium">{count.female}</span>
                    <button
                      onClick={() => updateCount(opt.id, "female", 1)}
                      className="w-7 h-7 rounded-full bg-accent/10 dark:bg-accent/20 text-accent-foreground flex items-center justify-center text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 총 인원 표시 */}
          <div className="mt-4 pt-3 border-t flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("schedule.total_travelers")}</span>
            <div className="flex items-center gap-3">
              <span className="text-primary text-sm">👨 {t("schedule.count_suffix", { count: totalMale })}</span>
              <span className="text-accent-foreground text-sm">👩 {t("schedule.count_suffix", { count: totalFemale })}</span>
              <span className="font-bold text-lg text-primary">{t("schedule.count_suffix", { count: totalTravelers })}</span>
            </div>
          </div>
        </section>

        {/* 취향 (복수 선택) */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>💝</span> {t("schedule.preference_title")} <span className="text-xs text-muted-foreground">{t("schedule.multi_select")}</span>
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {PREFERENCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => togglePreference(opt.id)}
                className={`py-3 px-2 rounded-xl font-medium transition-all flex flex-col items-center gap-1 ${
                  preferences.includes(opt.id)
                    ? "bg-primary text-white shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                <span className="text-lg">{opt.icon}</span>
                <span className="text-xs">{t(opt.labelKey)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 여행 목적 (복수 선택) */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>🎯</span> {t("schedule.purpose_title")} <span className="text-xs text-muted-foreground">{t("schedule.multi_select")}</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {PURPOSE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => togglePurpose(opt.id)}
                className={`py-3 px-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  purposes.includes(opt.id)
                    ? "bg-primary text-white shadow-md"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                <span>{opt.icon}</span>
                <span className="text-sm">{t(opt.labelKey)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={totalTravelers === 0}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary/85 text-white font-bold rounded-2xl shadow-lg hover:from-primary/90 hover:to-primary/80 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          {t("schedule.generate_button")}
        </button>

        {/* 저장된 일정 보기 버튼 */}
        <button
          onClick={showSavedList}
          className="w-full py-3 bg-white dark:bg-card border-2 border-primary/20 dark:border-primary/30 text-primary font-medium rounded-2xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
        >
          <List className="w-4 h-4" />
          {t("schedule.view_saved_list")}
        </button>

        {/* 안내 */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>{t("schedule.guide_line1")}</p>
          <p>{t("schedule.guide_line2")}</p>
        </div>
      </div>

      {/* 목록 이동 확인 다이얼로그 */}
      <ConfirmDialog
        open={confirmNavOpen}
        onOpenChange={setConfirmNavOpen}
        title={t("schedule.nav_confirm_title")}
        description={t("schedule.nav_confirm_desc")}
        onConfirm={() => {
          loadSavedSchedules();
          setViewMode("list");
        }}
      />
    </div>
  );
}

// 연령대별 남녀 구성 요약 텍스트 생성
// 예: "40대여(2)+60대여(1)" 또는 "20대남(1)+20대여(2)"
function formatAgeGenderSummary(breakdown?: AgeGenderCount[], totalFallback?: number, t?: (key: string, params?: Record<string, string | number>) => string): string {
  if (!breakdown || breakdown.length === 0) {
    return t ? t("schedule.count_suffix", { count: totalFallback || 0 }) : `${totalFallback || 0}명`;
  }

  const AGE_KEY_MAP: Record<string, string> = {
    "10s": "schedule.age_10s", "20s": "schedule.age_20s", "30s": "schedule.age_30s",
    "40s": "schedule.age_40s", "50s": "schedule.age_50s", "60s_plus": "schedule.age_60s",
  };

  const parts: string[] = [];
  for (const g of breakdown) {
    const label = t ? t(AGE_KEY_MAP[g.ageGroup] || g.ageGroup) : g.ageGroup;
    if (g.male > 0) parts.push(t ? t("schedule.age_summary_male", { label, count: g.male }) : `${label}남(${g.male})`);
    if (g.female > 0) parts.push(t ? t("schedule.age_summary_female", { label, count: g.female }) : `${label}여(${g.female})`);
  }

  return parts.length > 0 ? parts.join("+") : (t ? t("schedule.count_suffix", { count: totalFallback || 0 }) : `${totalFallback || 0}명`);
}
