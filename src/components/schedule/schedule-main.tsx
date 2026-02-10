"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Sparkles, Loader2, Minus, Plus, Plane, Users, Hotel, MapPin, LogIn, List, Trash2, Calendar, Search, CheckCircle } from "lucide-react";
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
  const [purpose, setPurpose] = useState<PurposeType>("food_tour");

  // 로딩 및 결과 상태
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [schedule, setSchedule] = useState<TravelSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (data.success) {
        setViewingSchedule(data.data.schedule);
        setViewMode("view");
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
    } finally {
      setLoadingSaved(false);
    }
  };

  // 저장된 일정 삭제
  const deleteSavedSchedule = async (id: string) => {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    try {
      const response = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        setSavedSchedules((prev) => prev.filter((s) => s._id !== id));
      }
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  };

  // 목록 보기로 전환
  const showSavedList = () => {
    loadSavedSchedules();
    setViewMode("list");
  };

  // 일정 생성
  const handleGenerate = async () => {
    if (totalTravelers === 0) {
      setError("여행 인원을 1명 이상 입력해주세요.");
      return;
    }
    if (preferences.length === 0) {
      setError("취향을 1개 이상 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep("여행자 정보 분석 중...");

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
        purpose,
        ageGenderBreakdown: activeAgeGroups,
        arrivalTime,
        departureTime,
        accommodation,
      };

      setLoadingStep("AI가 맞춤 일정을 생성 중...");

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
              <h1 className="font-bold text-white text-lg">나만의 타이베이 일정</h1>
              <p className="text-white/80 text-xs">AI가 맞춤 일정을 만들어드려요</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary/85 rounded-full flex items-center justify-center mb-6">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            AI 일정 생성 기능은 회원만 이용 가능합니다.<br />
            로그인하시면 일정을 저장하고 언제든 다시 볼 수 있어요.
          </p>
          <Button
            onClick={onLoginClick}
            className="bg-gradient-to-r from-primary to-primary/85 text-white px-8 py-3 rounded-xl"
          >
            <LogIn className="w-4 h-4 mr-2" />
            로그인 / 회원가입
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
          <p className="text-sm text-muted-foreground">일정을 불러오는 중...</p>
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
    return <ScheduleResult schedule={viewingSchedule} onBack={handleBackToList} onGoToSavedList={showSavedList} user={user} />;
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
                <h1 className="font-bold text-white text-lg">저장된 일정</h1>
                <p className="text-white/80 text-xs">{savedSchedules.length}개의 일정</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setViewMode("create")}
              className="h-11 px-4 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-1" />
              일정 만들기
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
              <p className="text-muted-foreground">저장된 일정이 없습니다</p>
              <Button
                onClick={() => setViewMode("create")}
                className="mt-4 bg-primary text-white"
              >
                새 일정 만들기
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
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.days}일 · {item.travelers}명
                      {item.accommodation && ` · ${item.accommodation}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.savedAt).toLocaleDateString("ko-KR")}
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
          <h2 className="text-xl font-bold text-foreground mb-2">여행 일정을 만들고 있어요</h2>
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
            <h1 className="font-bold text-white text-lg">나만의 타이베이 일정</h1>
            <p className="text-white/80 text-xs">AI가 맞춤 일정을 만들어드려요</p>
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
            <span>📅</span> 여행 일수
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
              <span className="text-lg text-muted-foreground ml-1">일</span>
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
            <Plane className="w-4 h-4" /> 항공편 시간대
          </h2>

          {/* 입국 시간 */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">🛬 입국 (Day 1)</p>
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
                  <div>{opt.label}</div>
                  <div className="text-[10px] opacity-70">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 출국 시간 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">🛫 출국 (Day {days})</p>
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
                  <div>{opt.label}</div>
                  <div className="text-[10px] opacity-70">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 숙소 위치 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Hotel className="w-4 h-4" /> 숙소 위치
          </h2>
          <p className="text-xs text-muted-foreground mb-4">숙소명을 검색하면 자동으로 지역이 선택됩니다</p>

          {/* 숙소명 검색 */}
          <div className="mb-4 relative">
            <label className="text-xs text-muted-foreground mb-1 block">숙소명 검색</label>
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
                placeholder="예: Check Inn, 시저파크, W Hotel 등"
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
                검색
              </button>
            </div>

            {/* 검색 결과 드롭다운 */}
            {showHotelResults && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {hotelSearchResults.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    검색 결과가 없습니다. 직접 지역을 선택해주세요.
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
                        {hotel.districtLabel} 지역
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
              <MapPin className="w-3 h-3" /> 숙소 지역 {selectedHotelAddress ? "(자동 선택됨)" : "(직접 선택)"}
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
                  <div className="font-semibold">{district.label}</div>
                  <div className="text-[10px] opacity-70 truncate">{district.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 지역 인근 명소 표시 */}
          {accommodationDistrict && accommodationDistrict !== "other" && (
            <div className="mt-3 p-3 bg-primary/5 dark:bg-primary/10 rounded-lg">
              <p className="text-xs text-primary">
                📍 인근 명소: {TAIPEI_DISTRICT_OPTIONS.find(d => d.id === accommodationDistrict)?.nearbyAttractions.join(", ")}
              </p>
            </div>
          )}
        </section>

        {/* 여행 인원 (연령대별) */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
            <Users className="w-4 h-4" /> 여행 인원
          </h2>
          <p className="text-xs text-muted-foreground mb-4">연령대별로 남/녀 인원을 입력해주세요</p>

          {/* 인원 입력 테이블 */}
          <div className="space-y-2">
            {/* 헤더 */}
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs text-muted-foreground text-center pb-1 border-b">
              <div className="text-left">연령대</div>
              <div>👨 남성</div>
              <div>👩 여성</div>
            </div>

            {/* 연령대별 입력 */}
            {DETAILED_AGE_OPTIONS.map((opt) => {
              const count = ageGenderCounts.find((c) => c.ageGroup === opt.id)!;
              return (
                <div key={opt.id} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center py-1">
                  <div className="text-sm font-medium">{opt.label}</div>

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
            <span className="text-sm text-muted-foreground">총 인원</span>
            <div className="flex items-center gap-3">
              <span className="text-primary text-sm">👨 {totalMale}명</span>
              <span className="text-accent-foreground text-sm">👩 {totalFemale}명</span>
              <span className="font-bold text-lg text-primary">{totalTravelers}명</span>
            </div>
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
                    ? "bg-primary text-white shadow-md"
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
                    ? "bg-primary text-white shadow-md"
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
          disabled={totalTravelers === 0}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary/85 text-white font-bold rounded-2xl shadow-lg hover:from-primary/90 hover:to-primary/80 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5" />
          AI 일정 생성하기
        </button>

        {/* 저장된 일정 보기 버튼 */}
        <button
          onClick={showSavedList}
          className="w-full py-3 bg-white dark:bg-card border-2 border-primary/20 dark:border-primary/30 text-primary font-medium rounded-2xl hover:bg-primary/5 dark:hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
        >
          <List className="w-4 h-4" />
          저장된 일정 보기
        </button>

        {/* 안내 */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>AI가 연령대별 취향을 고려하여</p>
          <p>모두가 만족할 최적의 일정을 만들어드려요</p>
        </div>
      </div>
    </div>
  );
}
