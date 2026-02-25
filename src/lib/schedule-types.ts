// 타이베이 MZ 여행 스케줄러 타입 정의

// 시간대 타입
export type TimeSlot = "morning" | "lunch" | "afternoon" | "dinner" | "night";

// 활동 타입
export type ActivityType = "attraction" | "restaurant" | "shopping" | "cafe";

// 취향 타입
export type PreferenceType = "food" | "cafe" | "shopping" | "culture" | "nightview" | "nature";

// 여행 목적 타입
export type PurposeType = "healing" | "sns" | "food_tour" | "shopping" | "culture";

// 연령대 타입 (세분화)
export type AgeGroupType = "10s" | "20s" | "30s" | "40s" | "50s" | "60s_plus";

// 연령대별 인원 구성
export interface AgeGenderCount {
  ageGroup: AgeGroupType;
  male: number;
  female: number;
}

// 입국/출국 시간대
export type FlightTimeType = "early_morning" | "morning" | "afternoon" | "evening" | "night";

// 숙소 정보
export interface AccommodationInfo {
  name?: string;           // 숙소명 (예: "시저파크 타이베이")
  address?: string;        // 주소
  district?: string;       // 구/지역 (예: "시먼딩", "중산구")
  districtId?: string;     // 지역 ID
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// 사용자 입력
export interface ScheduleInput {
  days: number;           // 1~14
  travelers: number;      // 총 인원 (자동 계산)
  gender: "male" | "female" | "mixed"; // 자동 계산
  ageGroup: "20s" | "30s" | "40s_plus"; // 대표 연령대 (자동 계산)
  preferences: PreferenceType[];
  purposes: PurposeType[];
  // 세분화된 연령대별 인원
  ageGenderBreakdown?: AgeGenderCount[];
  // 입국/출국 시간대
  arrivalTime?: FlightTimeType;   // 입국 시간대
  departureTime?: FlightTimeType; // 출국 시간대
  // 숙소 정보
  accommodation?: AccommodationInfo;
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
  photos?: string[];      // 장소 사진 URL 배열 (최대 10장)
  travelFromPrev?: {      // 이전 장소에서 이동 정보
    method: string;       // "도보", "MRT", "버스", "택시" 등
    duration: string;     // "약 10분", "약 15분" 등
    description: string;  // 대화체 이동 안내 문구
  };
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
  generatedLanguage?: string; // 일정이 생성된 언어 ("ko" | "en")
}

// API 요청
export interface ScheduleGenerateRequest {
  days: number;
  travelers: number;
  gender: "male" | "female" | "mixed";
  ageGroup: "20s" | "30s" | "40s_plus";
  preferences: PreferenceType[];
  purposes: PurposeType[];
  ageGenderBreakdown?: AgeGenderCount[];
  arrivalTime?: FlightTimeType;
  departureTime?: FlightTimeType;
  accommodation?: AccommodationInfo;
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
export const PREFERENCE_OPTIONS: { id: PreferenceType; label: string; labelKey: string; icon: string }[] = [
  { id: "food", label: "맛집", labelKey: "schedule.pref_food", icon: "🍜" },
  { id: "cafe", label: "카페", labelKey: "schedule.pref_cafe", icon: "☕" },
  { id: "shopping", label: "쇼핑", labelKey: "schedule.pref_shopping", icon: "🛍️" },
  { id: "culture", label: "문화", labelKey: "schedule.pref_culture", icon: "🏛️" },
  { id: "nightview", label: "야경", labelKey: "schedule.pref_nightview", icon: "🌃" },
  { id: "nature", label: "자연", labelKey: "schedule.pref_nature", icon: "🌿" },
];

// 여행 목적 옵션
export const PURPOSE_OPTIONS: { id: PurposeType; label: string; labelKey: string; icon: string }[] = [
  { id: "food_tour", label: "맛집 투어", labelKey: "schedule.purpose_food_tour", icon: "🍜" },
  { id: "sns", label: "SNS 감성", labelKey: "schedule.purpose_sns", icon: "📸" },
  { id: "healing", label: "힐링", labelKey: "schedule.purpose_healing", icon: "🧘" },
  { id: "shopping", label: "쇼핑", labelKey: "schedule.purpose_shopping", icon: "🛒" },
  { id: "culture", label: "문화 체험", labelKey: "schedule.purpose_culture", icon: "🎭" },
];

// 성별 옵션
export const GENDER_OPTIONS: { id: "male" | "female" | "mixed"; label: string }[] = [
  { id: "male", label: "남성" },
  { id: "female", label: "여성" },
  { id: "mixed", label: "혼성" },
];

// 연령대 옵션 (기본)
export const AGE_GROUP_OPTIONS: { id: "20s" | "30s" | "40s_plus"; label: string }[] = [
  { id: "20s", label: "20대" },
  { id: "30s", label: "30대" },
  { id: "40s_plus", label: "40대 이상" },
];

// 연령대 옵션 (세분화)
export const DETAILED_AGE_OPTIONS: { id: AgeGroupType; label: string; labelKey: string; shortLabel: string }[] = [
  { id: "10s", label: "10대", labelKey: "schedule.age_10s", shortLabel: "10대" },
  { id: "20s", label: "20대", labelKey: "schedule.age_20s", shortLabel: "20대" },
  { id: "30s", label: "30대", labelKey: "schedule.age_30s", shortLabel: "30대" },
  { id: "40s", label: "40대", labelKey: "schedule.age_40s", shortLabel: "40대" },
  { id: "50s", label: "50대", labelKey: "schedule.age_50s", shortLabel: "50대" },
  { id: "60s_plus", label: "60대 이상", labelKey: "schedule.age_60s_plus", shortLabel: "60대+" },
];

// 입국/출국 시간대 옵션
export const FLIGHT_TIME_OPTIONS: { id: FlightTimeType; label: string; labelKey: string; description: string }[] = [
  { id: "early_morning", label: "이른 아침", labelKey: "schedule.flight_early_morning", description: "06:00~09:00" },
  { id: "morning", label: "오전", labelKey: "schedule.flight_morning", description: "09:00~12:00" },
  { id: "afternoon", label: "오후", labelKey: "schedule.flight_afternoon", description: "12:00~17:00" },
  { id: "evening", label: "저녁", labelKey: "schedule.flight_evening", description: "17:00~21:00" },
  { id: "night", label: "밤/심야", labelKey: "schedule.flight_night", description: "21:00~06:00" },
];

// 연령대별 특징 (AI 프롬프트용)
export const AGE_GROUP_PREFERENCES = {
  "10s": {
    food: "야시장 길거리 음식, 버블티, 감성 디저트, SNS 핫플",
    shopping: "캐릭터 굿즈, 스티커, 문구류, 트렌디한 소품",
    activity: "포토존, 체험 활동, 트렌디한 장소 선호",
    mobility: "활동적, 많이 걸어도 괜찮음",
  },
  "20s": {
    food: "야시장 길거리 음식(지파이, 곱창국수), 버블티, 감성 카페 디저트",
    shopping: "스트리트 패션, 스니커즈, 캐릭터 굿즈, 카페 소품",
    activity: "인스타 감성, 저렴하고 다양한 먹거리, 체험형 소비",
    mobility: "활동적, 많이 걸어도 괜찮음, 대중교통 선호",
  },
  "30s": {
    food: "샤오롱바오, 우육면, 로컬 맛집, 분위기 좋은 레스토랑",
    shopping: "디자인 소품, 차/커피 용품, 품질 좋은 기념품",
    activity: "맛집 탐방, 문화 체험, 적당한 쇼핑",
    mobility: "대중교통 + 택시 혼용, 적당한 도보",
  },
  "40s": {
    food: "우육면, 샤오롱바오, 루로우판, 전통 차",
    shopping: "차/건강식품, 전통 간식, 브랜드 의류",
    activity: "깊은 맛의 요리, 유명 맛집 중심, 건강과 품질 중시",
    mobility: "택시/버스 선호, 오래 걷는 것은 피곤해함",
  },
  "50s": {
    food: "우육면, 샤오롱바오, 루로우판, 전통 차, 건강식",
    shopping: "차/건강식품, 전통 간식, 가족 선물용 품목",
    activity: "유명 관광지, 편안한 일정, 실용적 소비",
    mobility: "택시/관광버스 선호, 장시간 도보 어려움",
  },
  "60s_plus": {
    food: "죽, 국수류, 전통 찻집, 소화 잘 되는 음식",
    shopping: "기념품, 전통 공예품, 건조 과일/차",
    activity: "편안하고 부담 없는 식사, 전통 문화 체험",
    mobility: "택시/관광버스 필수, 휴식 시간 충분히 필요",
  },
};

// 타이베이 주요 지역 옵션 (숙소 위치용)
export const TAIPEI_DISTRICT_OPTIONS: {
  id: string;
  label: string;
  labelKey: string;
  labelEn: string;
  description: string;
  descKey: string;
  nearbyAttractions: string[];
  nearbyAttractionsEn: string[];
}[] = [
  {
    id: "ximending",
    label: "시먼딩",
    labelKey: "schedule.district_ximending",
    labelEn: "Ximending",
    description: "젊은 감성, 쇼핑, 야시장",
    descKey: "schedule.district_ximending_desc",
    nearbyAttractions: ["시먼딩 거리", "홍러우", "용산사"],
    nearbyAttractionsEn: ["Ximending Street", "The Red House", "Longshan Temple"],
  },
  {
    id: "zhongshan",
    label: "중산구",
    labelKey: "schedule.district_zhongshan",
    labelEn: "Zhongshan",
    description: "비즈니스, 쇼핑몰, 마사지",
    descKey: "schedule.district_zhongshan_desc",
    nearbyAttractions: ["중산역 지하상가", "닝샤야시장", "타이베이역"],
    nearbyAttractionsEn: ["Zhongshan Underground Mall", "Ningxia Night Market", "Taipei Main Station"],
  },
  {
    id: "xinyi",
    label: "신이구",
    labelKey: "schedule.district_xinyi",
    labelEn: "Xinyi",
    description: "타이베이101, 고급 쇼핑, 야경",
    descKey: "schedule.district_xinyi_desc",
    nearbyAttractions: ["타이베이101", "신광미츠코시", "상산"],
    nearbyAttractionsEn: ["Taipei 101", "Shin Kong Mitsukoshi", "Elephant Mountain"],
  },
  {
    id: "daan",
    label: "다안구",
    labelKey: "schedule.district_daan",
    labelEn: "Da'an",
    description: "용캉제, 감성 카페, 로컬 맛집",
    descKey: "schedule.district_daan_desc",
    nearbyAttractions: ["용캉제", "다안삼림공원", "영강우육면"],
    nearbyAttractionsEn: ["Yongkang Street", "Daan Forest Park", "Yongkang Beef Noodle"],
  },
  {
    id: "zhongzheng",
    label: "중정구",
    labelKey: "schedule.district_zhongzheng",
    labelEn: "Zhongzheng",
    description: "타이베이역, 중정기념당",
    descKey: "schedule.district_zhongzheng_desc",
    nearbyAttractions: ["중정기념당", "타이베이역", "화산1914"],
    nearbyAttractionsEn: ["CKS Memorial Hall", "Taipei Main Station", "Huashan 1914"],
  },
  {
    id: "wanhua",
    label: "만화구",
    labelKey: "schedule.district_wanhua",
    labelEn: "Wanhua",
    description: "용산사, 전통시장, 역사",
    descKey: "schedule.district_wanhua_desc",
    nearbyAttractions: ["용산사", "화시제야시장", "보피랴오거리"],
    nearbyAttractionsEn: ["Longshan Temple", "Huaxi Night Market", "Bopiliao Street"],
  },
  {
    id: "songshan",
    label: "송산구",
    labelKey: "schedule.district_songshan",
    labelEn: "Songshan",
    description: "라오허제야시장, 송산문창",
    descKey: "schedule.district_songshan_desc",
    nearbyAttractions: ["라오허제야시장", "송산문창원구", "무지개다리"],
    nearbyAttractionsEn: ["Raohe Night Market", "Songshan Cultural Park", "Rainbow Bridge"],
  },
  {
    id: "shilin",
    label: "스린구",
    labelKey: "schedule.district_shilin",
    labelEn: "Shilin",
    description: "스린야시장, 고궁박물원",
    descKey: "schedule.district_shilin_desc",
    nearbyAttractions: ["스린야시장", "고궁박물원", "양밍산"],
    nearbyAttractionsEn: ["Shilin Night Market", "National Palace Museum", "Yangmingshan"],
  },
  {
    id: "beitou",
    label: "베이터우",
    labelKey: "schedule.district_beitou",
    labelEn: "Beitou",
    description: "온천, 휴양",
    descKey: "schedule.district_beitou_desc",
    nearbyAttractions: ["베이터우온천", "지열곡", "베이터우도서관"],
    nearbyAttractionsEn: ["Beitou Hot Springs", "Thermal Valley", "Beitou Library"],
  },
  {
    id: "neihu",
    label: "네이후구",
    labelKey: "schedule.district_neihu",
    labelEn: "Neihu",
    description: "미라마 관람차, IT단지",
    descKey: "schedule.district_neihu_desc",
    nearbyAttractions: ["미라마 관람차", "네이후 IT파크"],
    nearbyAttractionsEn: ["Miramar Ferris Wheel", "Neihu Tech Park"],
  },
  {
    id: "banqiao",
    label: "반차오 (신베이)",
    labelKey: "schedule.district_banqiao",
    labelEn: "Banqiao",
    description: "반차오역, 신베이시청",
    descKey: "schedule.district_banqiao_desc",
    nearbyAttractions: ["반차오역", "신베이시민광장", "린가 야시장"],
    nearbyAttractionsEn: ["Banqiao Station", "New Taipei Civic Plaza", "Lehua Night Market"],
  },
  {
    id: "other",
    label: "기타/모름",
    labelKey: "schedule.district_other",
    labelEn: "Other",
    description: "직접 입력",
    descKey: "schedule.district_other_desc",
    nearbyAttractions: [],
    nearbyAttractionsEn: [],
  },
];
