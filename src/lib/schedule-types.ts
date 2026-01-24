// 타이베이 MZ 여행 스케줄러 타입 정의

// 시간대 타입
export type TimeSlot = "morning" | "lunch" | "afternoon" | "dinner" | "night";

// 활동 타입
export type ActivityType = "attraction" | "restaurant" | "shopping" | "cafe";

// 취향 타입
export type PreferenceType = "food" | "cafe" | "shopping" | "culture" | "nightview" | "nature";

// 여행 목적 타입
export type PurposeType = "healing" | "sns" | "food_tour" | "shopping" | "culture";

// 사용자 입력
export interface ScheduleInput {
  days: number;           // 1~7
  travelers: number;      // 1~10
  gender: "male" | "female" | "mixed";
  ageGroup: "20s" | "30s" | "40s_plus";
  preferences: PreferenceType[];
  purpose: PurposeType;
}

// 개별 활동
export interface ScheduleActivity {
  id: string;
  timeSlot: TimeSlot;
  timeSlotKo: string;     // "오전", "점심", "오후", "저녁", "밤"
  type: ActivityType;
  name: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  reason: string;         // 추천 이유
  tip?: string;           // 꿀팁
  shoppingItems?: string[]; // 쇼핑 아이템
  coordinates?: {
    lat: number;
    lng: number;
  };
  place_id?: string;
  category?: string;
  isEdited?: boolean;     // 사용자가 수정했는지
}

// 일차별 일정
export interface DaySchedule {
  day: number;
  theme: string;          // "로컬 감성 + 먹거리 + 쇼핑"
  activities: ScheduleActivity[];
}

// 전체 일정
export interface TravelSchedule {
  id: string;
  createdAt: string;
  input: ScheduleInput;
  schedule: DaySchedule[];
  tips: string[];
  budget: string;
}

// API 요청
export interface ScheduleGenerateRequest {
  days: number;
  travelers: number;
  gender: "male" | "female" | "mixed";
  ageGroup: "20s" | "30s" | "40s_plus";
  preferences: PreferenceType[];
  purpose: PurposeType;
}

// API 응답
export interface ScheduleGenerateResponse {
  success: boolean;
  data?: {
    schedule: DaySchedule[];
    tips: string[];
    budget: string;
  };
  error?: string;
}

// 시간대 한글 매핑
export const TIME_SLOT_KO: Record<TimeSlot, string> = {
  morning: "오전",
  lunch: "점심",
  afternoon: "오후",
  dinner: "저녁",
  night: "밤",
};

// 시간대 아이콘 매핑
export const TIME_SLOT_ICON: Record<TimeSlot, string> = {
  morning: "🌅",
  lunch: "🍽️",
  afternoon: "☕",
  dinner: "🌙",
  night: "🌃",
};

// 취향 옵션
export const PREFERENCE_OPTIONS: { id: PreferenceType; label: string; icon: string }[] = [
  { id: "food", label: "맛집", icon: "🍜" },
  { id: "cafe", label: "카페", icon: "☕" },
  { id: "shopping", label: "쇼핑", icon: "🛍️" },
  { id: "culture", label: "문화", icon: "🏛️" },
  { id: "nightview", label: "야경", icon: "🌃" },
  { id: "nature", label: "자연", icon: "🌿" },
];

// 여행 목적 옵션
export const PURPOSE_OPTIONS: { id: PurposeType; label: string; icon: string }[] = [
  { id: "food_tour", label: "맛집 투어", icon: "🍜" },
  { id: "sns", label: "SNS 감성", icon: "📸" },
  { id: "healing", label: "힐링", icon: "🧘" },
  { id: "shopping", label: "쇼핑", icon: "🛒" },
  { id: "culture", label: "문화 체험", icon: "🎭" },
];

// 성별 옵션
export const GENDER_OPTIONS: { id: "male" | "female" | "mixed"; label: string }[] = [
  { id: "male", label: "남성" },
  { id: "female", label: "여성" },
  { id: "mixed", label: "혼성" },
];

// 연령대 옵션
export const AGE_GROUP_OPTIONS: { id: "20s" | "30s" | "40s_plus"; label: string }[] = [
  { id: "20s", label: "20대" },
  { id: "30s", label: "30대" },
  { id: "40s_plus", label: "40대 이상" },
];
