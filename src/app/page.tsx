"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { User, LogOut, Search, X, MapPin, ChevronDown, Key, UserMinus, History, ArrowLeft, Moon, Sun } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BottomNav } from "@/components/bottom-nav";
import { RestaurantCard } from "@/components/restaurant-card";
import { RestaurantList } from "@/components/restaurant-list";
import { RestaurantDetail } from "@/components/restaurant-detail";
import { CategorySheet } from "@/components/category-sheet";
import { AuthModal } from "@/components/auth-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { NearbyRestaurants, NearbyState } from "@/components/nearby-restaurants";
import { AddRestaurantModal } from "@/components/add-restaurant-modal";
import { DeleteAccountModal } from "@/components/delete-account-modal";
import { RestaurantHistoryList } from "@/components/restaurant-history";
import { ToiletFinder } from "@/components/toilet-finder";
import { ScheduleMain } from "@/components/schedule/schedule-main";
import { Onboarding } from "@/components/onboarding";
import { AIRecommend, RecommendState } from "@/components/ai-recommend";
import {
  Restaurant,
  categories,
  markets,
  tourAreas,
  getRestaurantsByCategory,
  getRestaurantsByMarket,
  getRestaurantsByTour,
  getPlaces,
  getPopularRestaurants,
  searchRestaurants,
  generateStaticPlaceId,
  getAllRestaurants,
  getTimeBasedRecommendations,
  getDisplayName,
  getDisplayLocation,
  getDisplayNightMarket,
} from "@/data/taiwan-food";
import { getRestaurantDistrict, isValidDistrict, DISTRICT_INFO } from "@/lib/district-utils";
import { useTheme } from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";

type View = "home" | "list" | "detail" | "nearby" | "history" | "toilet" | "district-ranking" | "guide" | "schedule" | "ai-recommend";
type TabType = "home" | "category" | "market" | "tour" | "places" | "nearby" | "add" | "schedule";
type GuideTabType = "overview" | "weather" | "transport" | "accommodation";

interface UserInfo {
  id: number;
  name: string;
  profile_image?: string;
  is_admin: boolean;
  has_password?: boolean;
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const { t, language, toggleLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [currentView, setCurrentView] = useState<View>("home");
  const [viewHistory, setViewHistory] = useState<View[]>([]); // 네비게이션 스택
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [listTitle, setListTitle] = useState("");
  const [listItems, setListItems] = useState<Restaurant[]>([]);

  // AI 추천 상태 보존
  const [aiRecommendState, setAiRecommendState] = useState<RecommendState | null>(null);
  // 주변맛집 상태 보존
  const [nearbyState, setNearbyState] = useState<NearbyState | null>(null);

  // 시트 상태
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [marketSheetOpen, setMarketSheetOpen] = useState(false);
  const [tourSheetOpen, setTourSheetOpen] = useState(false);

  // 홈 화면 야시장 필터
  const [selectedMarket, setSelectedMarket] = useState("전체");

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // 실시간 검색 결과 (자동완성)
  const searchSuggestions = useMemo(() => {
    if (searchQuery.trim().length < 1) return [];
    return searchRestaurants(searchQuery).slice(0, 8); // 최대 8개 제안
  }, [searchQuery]);

  // 사용자 인증 상태
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 맛집 등록 모달 상태
  const [addRestaurantModalOpen, setAddRestaurantModalOpen] = useState(false);

  // 가이드 탭 상태
  const [guideTab, setGuideTab] = useState<GuideTabType>("overview");

  // 실시간 평점 상태
  const [liveRatings, setLiveRatings] = useState<Record<string, { rating: number | null; userRatingsTotal: number | null }>>({});

  // 삭제된 정적 데이터 ID 목록 (홈화면 필터링용)
  const [deletedStaticIds, setDeletedStaticIds] = useState<string[]>([]);

  // DB 캐시된 이미지 URL (일괄 조회)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  // 온보딩 상태
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("onboarding_completed")) {
      setShowOnboarding(true);
    }
  }, []);

  // 로그인 상태 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    checkAuth();
  }, []);

  // 네이티브 앱: 카카오 로그인 딥링크(taiwanfood://auth?token=...) 수신 처리
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isNative = (window as any).Capacitor?.isNativePlatform?.() === true;
    if (!isNative) return;

    let cleanup: (() => void) | undefined;

    const setupDeepLinkListener = async () => {
      try {
        const { App: CapApp } = await import("@capacitor/app");
        const { Browser } = await import("@capacitor/browser");

        const listener = await CapApp.addListener("appUrlOpen", async (event) => {
          // taiwanfood://auth?token=... 형식의 딥링크 처리
          if (event.url.startsWith("taiwanfood://auth")) {
            // SFSafariViewController 먼저 닫기
            try { await Browser.close(); } catch { /* ignore */ }

            // URL에서 토큰 추출 (custom scheme은 new URL() 파싱 실패 가능 → regex 사용)
            const tokenMatch = event.url.match(/[?&]token=([^&]+)/);
            const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

            if (token) {
              // GET 요청으로 쿠키 설정 후 메인 페이지로 리다이렉트
              // (CapacitorHttp가 fetch를 프록시하여 쿠키가 안 붙는 문제 우회)
              window.location.href = `/api/auth/set-token?token=${encodeURIComponent(token)}`;
            }
          }
        });

        cleanup = () => listener.remove();
      } catch {
        // Capacitor App 플러그인 없는 경우 무시
      }
    };

    setupDeepLinkListener();
    return () => cleanup?.();
  }, []);

  // 검색창 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // 삭제된 정적 데이터 ID 로드
  useEffect(() => {
    const loadDeletedStaticIds = async () => {
      try {
        const res = await fetch("/api/custom-restaurants");
        const data = await res.json();
        if (data.deletedStaticIds) {
          setDeletedStaticIds(data.deletedStaticIds);
        }
      } catch (error) {
        console.error("Failed to load deleted static IDs:", error);
      }
    };
    loadDeletedStaticIds();
  }, []);

  // 인기 맛집 (카테고리별 최고 평점 맛집) - 기본 데이터
  const basePopularRestaurants = useMemo(() => {
    return getPopularRestaurants();
  }, []);

  // 야시장별 맛집 - 기본 데이터
  const baseMarketRestaurants = useMemo(() => {
    return getRestaurantsByMarket(selectedMarket);
  }, [selectedMarket]);

  // 실시간 평점 조회
  useEffect(() => {
    const fetchLiveRatings = async () => {
      // 인기 맛집 + 야시장 맛집 이름 수집
      const names = [
        ...basePopularRestaurants.map(r => r.이름),
        ...baseMarketRestaurants.map(r => r.이름)
      ];
      const uniqueNames = [...new Set(names)];

      if (uniqueNames.length === 0) return;

      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: uniqueNames })
        });
        const data = await res.json();
        if (data.ratings) {
          setLiveRatings(data.ratings);
        }
      } catch (error) {
        console.error("Failed to fetch live ratings:", error);
      }
    };

    fetchLiveRatings();
  }, [basePopularRestaurants, baseMarketRestaurants]);

  // DB 캐시된 이미지 URL 일괄 조회 (개별 place-photo 호출 제거)
  useEffect(() => {
    const fetchImageUrls = async () => {
      try {
        const res = await fetch("/api/home-data");
        const data = await res.json();
        if (data.data?.imageUrls) {
          setImageUrls(data.data.imageUrls);
        }
      } catch (error) {
        console.error("Failed to fetch image URLs:", error);
      }
    };
    fetchImageUrls();
  }, []);

  // 실시간 평점 적용된 인기 맛집 (평점 높은 순 정렬, 삭제된 정적 데이터 제외)
  const popularRestaurants = useMemo(() => {
    return basePopularRestaurants
      .filter(r => {
        // 삭제된 정적 데이터 필터링
        if (deletedStaticIds.length === 0) return true;
        const staticPlaceId = generateStaticPlaceId(r.이름, r.category || "");
        return !deletedStaticIds.includes(staticPlaceId);
      })
      .map(r => ({
        ...r,
        평점: liveRatings[r.이름]?.rating ?? r.평점,
        리뷰수: liveRatings[r.이름]?.userRatingsTotal ?? r.리뷰수
      }))
      .sort((a, b) => (b.평점 || 0) - (a.평점 || 0));
  }, [basePopularRestaurants, liveRatings, deletedStaticIds]);

  // 실시간 평점 적용된 야시장별 맛집 (평점 높은 순 정렬, 상위 6개, 삭제된 정적 데이터 제외)
  const marketRestaurants = useMemo(() => {
    return baseMarketRestaurants
      .filter(r => {
        // 삭제된 정적 데이터 필터링
        if (deletedStaticIds.length === 0) return true;
        const staticPlaceId = generateStaticPlaceId(r.이름, r.category || "");
        return !deletedStaticIds.includes(staticPlaceId);
      })
      .map(r => ({
        ...r,
        평점: liveRatings[r.이름]?.rating ?? r.평점,
        리뷰수: liveRatings[r.이름]?.userRatingsTotal ?? r.리뷰수
      }))
      .sort((a, b) => (b.평점 || 0) - (a.평점 || 0))
      .slice(0, 6);
  }, [baseMarketRestaurants, liveRatings, deletedStaticIds]);

  // 지역별 맛집 랭킹 계산
  const districtRanking = useMemo(() => {
    const allRestaurants = getAllRestaurants();
    const districtData: Record<string, { restaurants: Restaurant[]; totalRating: number; count: number }> = {};

    // 지역별로 그룹화
    for (const restaurant of allRestaurants) {
      const district = getRestaurantDistrict(restaurant.위치);
      if (!isValidDistrict(district)) continue;

      // 삭제된 정적 데이터 필터링
      if (deletedStaticIds.length > 0) {
        const staticPlaceId = generateStaticPlaceId(restaurant.이름, restaurant.category || "");
        if (deletedStaticIds.includes(staticPlaceId)) continue;
      }

      const rating = liveRatings[restaurant.이름]?.rating ?? restaurant.평점 ?? 0;
      if (rating === 0) continue;

      if (!districtData[district]) {
        districtData[district] = { restaurants: [], totalRating: 0, count: 0 };
      }

      districtData[district].restaurants.push({
        ...restaurant,
        평점: rating,
        리뷰수: liveRatings[restaurant.이름]?.userRatingsTotal ?? restaurant.리뷰수
      });
      districtData[district].totalRating += rating;
      districtData[district].count += 1;
    }

    // 평균 평점 계산 및 정렬
    const ranking = Object.entries(districtData)
      .map(([district, data]) => ({
        district,
        avgRating: data.count > 0 ? data.totalRating / data.count : 0,
        count: data.count,
        restaurants: data.restaurants.sort((a, b) => (b.평점 || 0) - (a.평점 || 0)),
      }))
      .filter(item => item.count >= 2) // 최소 2개 이상의 맛집이 있는 지역만
      .sort((a, b) => b.avgRating - a.avgRating);

    return ranking;
  }, [liveRatings, deletedStaticIds]);

  // 시간대별 맛집 추천 (대만 시간 UTC+8 기준)
  const timeRecommendation = useMemo(() => {
    const taiwanTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
    const taiwanHour = new Date(taiwanTime).getHours();
    return getTimeBasedRecommendations(taiwanHour);
  }, []);

  // 지역 클릭 핸들러
  const handleDistrictSelect = useCallback((district: string, restaurants: Restaurant[]) => {
    const districtInfo = DISTRICT_INFO[district];
    setListTitle(t("home.district_restaurants", { district: districtInfo?.name || district }));
    setListItems(restaurants);
    setViewHistory(prev => [...prev, currentView]); // 현재 화면을 스택에 push
    setCurrentView("list");
    setActiveTab("home");
    window.scrollTo(0, 0);
  }, [currentView]);

  // 검색 처리 (정적 데이터 + DB 맛집 통합 검색)
  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 1) return;

    setShowSuggestions(false);
    setCurrentView("list");
    setActiveTab("home");

    // 정적 데이터 검색
    const staticResults = searchRestaurants(query);

    // DB 맛집 검색
    try {
      const res = await fetch(`/api/custom-restaurants?q=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success && data.data?.length > 0) {
        const getPriceRangeText = (level?: number): string | undefined => {
          if (level === undefined) return undefined;
          const priceMap: Record<number, string> = {
            1: t("price.cheap"),
            2: t("price.normal"),
            3: t("price.expensive"),
            4: t("price.very_expensive"),
          };
          return priceMap[level];
        };

        const dbResults: Restaurant[] = data.data.map((item: {
          place_id: string;
          name: string;
          address: string;
          category: string;
          feature?: string;
          google_rating?: number;
          google_reviews_count?: number;
          coordinates?: { lat: number; lng: number };
          price_level?: number;
          phone_number?: string;
          registered_by?: number;
          name_en?: string;
          address_en?: string;
          feature_en?: string;
        }) => ({
          이름: item.name,
          위치: item.address,
          특징: item.feature || "",
          평점: item.google_rating,
          리뷰수: item.google_reviews_count,
          coordinates: item.coordinates,
          전화번호: item.phone_number,
          가격대: getPriceRangeText(item.price_level),
          place_id: item.place_id,
          category: item.category,
          registered_by: item.registered_by,
          name_en: item.name_en,
          location_en: item.address_en,
          feature_en: item.feature_en,
        }));

        // 중복 제거 (DB 맛집 우선)
        const dbNames = new Set(dbResults.map(r => r.이름));
        const filteredStatic = staticResults.filter(r => !dbNames.has(r.이름));
        const merged = [...dbResults, ...filteredStatic];

        setListTitle(t("home.search_results", { query, count: merged.length }));
        setListItems(merged);
        return;
      }
    } catch (error) {
      console.error("DB search error:", error);
    }

    setListTitle(t("home.search_results", { query, count: staticResults.length }));
    setListItems(staticResults);
  }, []);

  // 자동완성에서 식당 선택
  const handleSuggestionSelect = (restaurant: Restaurant) => {
    setSearchQuery("");
    setShowSuggestions(false);
    setViewHistory(prev => [...prev, "home"]);
    setSelectedRestaurant(restaurant);
    setCurrentView("detail");
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setShowSuggestions(false);
    setCurrentView("home");
  };

  // 탭 변경 처리
  const handleTabChange = (tab: TabType) => {
    if (tab === "home") {
      setCurrentView("home");
      setActiveTab("home");
      setSearchQuery("");
    } else if (tab === "nearby") {
      setCurrentView("nearby");
      setActiveTab("nearby");
    } else if (tab === "add") {
      // 맛집 등록 - 관리자 또는 박병철만 가능
      setActiveTab("add");
      if (!user) {
        setAuthModalOpen(true);
      } else if (user.is_admin || user.name === "박병철") {
        setAddRestaurantModalOpen(true);
      }
    } else if (tab === "category") {
      setActiveTab("category");
      setCategorySheetOpen(true);
    } else if (tab === "market") {
      setActiveTab("market");
      setMarketSheetOpen(true);
    } else if (tab === "tour") {
      setActiveTab("tour");
      setTourSheetOpen(true);
    } else if (tab === "places") {
      setListTitle(t("home.places"));
      setListItems(getPlaces());
      setCurrentView("list");
      setActiveTab("places");
    } else if (tab === "schedule") {
      setCurrentView("schedule");
      setActiveTab("schedule");
    }
  };

  // 카테고리 선택 (사용자 등록 맛집도 포함)
  const handleCategorySelect = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    setListTitle(categoryId === "전체" ? t("restaurant.all_restaurants") : t("restaurant.category_restaurants", { category: category ? t(category.nameKey) : categoryId }));

    // 정적 데이터 가져오기
    let staticRestaurants = getRestaurantsByCategory(categoryId);

    // 사용자 등록 맛집 가져오기
    try {
      const categoryParam = categoryId === "전체" ? "" : `?category=${encodeURIComponent(categoryId)}`;
      const res = await fetch(`/api/custom-restaurants${categoryParam}`);
      const data = await res.json();

      // 삭제된 정적 데이터 필터링
      const deletedStaticIds: string[] = data.deletedStaticIds || [];
      if (deletedStaticIds.length > 0) {
        staticRestaurants = staticRestaurants.filter(r => {
          // place_id가 이미 있으면 사용, 없으면 생성
          const staticPlaceId = r.place_id || generateStaticPlaceId(r.이름, r.category || categoryId);
          return !deletedStaticIds.includes(staticPlaceId);
        });
      }

      if (data.success && data.data?.length > 0) {
        // 가격대 변환 함수
        const getPriceRangeText = (level?: number): string | undefined => {
          if (level === undefined) return undefined;
          const priceMap: Record<number, string> = {
            1: t("price.cheap"),
            2: t("price.normal"),
            3: t("price.expensive"),
            4: t("price.very_expensive"),
          };
          return priceMap[level];
        };

        // CustomRestaurant를 Restaurant 형식으로 변환 (place_id, category, registered_by 포함)
        const customRestaurants: Restaurant[] = data.data.map((item: {
          place_id: string;
          name: string;
          address: string;
          category: string;
          feature?: string;
          google_rating?: number;
          google_reviews_count?: number;
          coordinates?: { lat: number; lng: number };
          price_level?: number;
          phone_number?: string;
          registered_by?: number;
          name_en?: string;
          address_en?: string;
          feature_en?: string;
        }) => ({
          이름: item.name,
          위치: item.address,
          특징: item.feature || "",
          평점: item.google_rating,
          리뷰수: item.google_reviews_count,
          coordinates: item.coordinates,
          전화번호: item.phone_number,
          가격대: getPriceRangeText(item.price_level),
          // 사용자 등록 맛집 추가 정보
          place_id: item.place_id,
          category: item.category,
          registered_by: item.registered_by,
          name_en: item.name_en,
          location_en: item.address_en,
          feature_en: item.feature_en,
        }));

        console.log("Custom restaurants:", customRestaurants.map(r => ({ name: r.이름, place_id: r.place_id })));

        // 정적 데이터와 병합 (사용자 등록 맛집을 앞에 배치)
        setListItems([...customRestaurants, ...staticRestaurants]);
      } else {
        setListItems(staticRestaurants);
      }
    } catch (error) {
      console.error("사용자 등록 맛집 조회 오류:", error);
      setListItems(staticRestaurants);
    }

    setCurrentView("list");
    setActiveTab("category");
    window.scrollTo(0, 0);
  };

  // 야시장 선택
  const handleMarketSelect = (marketId: string) => {
    const market = markets.find((m) => m.id === marketId);
    setListTitle(marketId === "전체" ? t("market.all") : market ? t(market.nameKey) : marketId);
    setListItems(getRestaurantsByMarket(marketId));
    setCurrentView("list");
    setActiveTab("market");
    window.scrollTo(0, 0);
  };

  // 도심투어 선택
  const handleTourSelect = (areaId: string) => {
    const area = tourAreas.find((a) => a.id === areaId);
    setListTitle(areaId === "전체" ? t("tour.all") : t("restaurant.tour_restaurants", { area: area ? t(area.nameKey) : areaId }));
    setListItems(getRestaurantsByTour(areaId));
    setCurrentView("list");
    setActiveTab("tour");
    window.scrollTo(0, 0);
  };

  // 맛집 선택
  const handleRestaurantSelect = (restaurant: Restaurant) => {
    console.log("Selected restaurant:", { name: restaurant.이름, place_id: restaurant.place_id, category: restaurant.category });
    setViewHistory(prev => [...prev, currentView]); // 현재 화면을 스택에 push
    setSelectedRestaurant(restaurant);
    setCurrentView("detail");
  };

  // place_id로 맛집 상세 화면 이동 (히스토리에서 사용)
  const handleRestaurantSelectByPlaceId = async (placeId: string) => {
    try {
      // custom_restaurants에서 조회
      const res = await fetch(`/api/custom-restaurants?place_id=${placeId}`);
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        const customRestaurant = data.data[0];
        // CustomRestaurant를 Restaurant 형식으로 변환
        const restaurant: Restaurant = {
          이름: customRestaurant.name,
          위치: customRestaurant.address,
          특징: customRestaurant.feature || "",
          가격대: customRestaurant.price_level ? `${"$".repeat(customRestaurant.price_level)}` : "",
          place_id: customRestaurant.place_id,
          category: customRestaurant.category,
          coordinates: customRestaurant.coordinates,
          registered_by: customRestaurant.registered_by,
          name_en: customRestaurant.name_en,
          location_en: customRestaurant.address_en,
          feature_en: customRestaurant.feature_en,
        };
        setViewHistory(prev => [...prev, currentView]);
        setSelectedRestaurant(restaurant);
        setCurrentView("detail");
      }
    } catch (error) {
      console.error("맛집 조회 실패:", error);
    }
  };

  // 뒤로가기
  const handleBack = useCallback(() => {
    // 스택에서 이전 화면 가져오기
    const previousView = viewHistory[viewHistory.length - 1] || "home";

    // 스택에서 제거
    setViewHistory(prev => prev.slice(0, -1));

    // 이전 화면으로 이동
    setCurrentView(previousView);

    // 화면별 추가 처리
    if (currentView === "detail") {
      setSelectedRestaurant(null);
    }

    // activeTab 설정
    if (previousView === "nearby") {
      setActiveTab("nearby");
    } else {
      setActiveTab("home");
    }
  }, [currentView, viewHistory]);

  // 스와이프 뒤로가기 (홈이 아닌 화면에서만 활성화)
  useSwipeBack({
    onSwipeBack: handleBack,
    enabled: currentView !== "home",
    threshold: 80,
    edgeWidth: 25,
  });

  // Pull-to-Refresh (홈 화면에서만 활성화)
  const handlePullToRefresh = useCallback(async () => {
    const names = [
      ...basePopularRestaurants.map(r => r.이름),
      ...baseMarketRestaurants.map(r => r.이름)
    ];
    const uniqueNames = [...new Set(names)];

    const [ratingsRes, customRes] = await Promise.all([
      fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: uniqueNames })
      }),
      fetch("/api/custom-restaurants")
    ]);

    const [ratingsData, customData] = await Promise.all([
      ratingsRes.json(),
      customRes.json()
    ]);

    if (ratingsData.ratings) setLiveRatings(ratingsData.ratings);
    if (customData.deletedStaticIds) setDeletedStaticIds(customData.deletedStaticIds);
  }, [basePopularRestaurants, baseMarketRestaurants]);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handlePullToRefresh,
    enabled: currentView === "home",
  });

  // 렌더링
  if (currentView === "detail" && selectedRestaurant) {
    return (
      <>
        <RestaurantDetail
          restaurant={selectedRestaurant}
          onBack={handleBack}
          user={user}
          onUpdate={(updatedData) => {
            // 수정된 데이터를 selectedRestaurant에 반영
            setSelectedRestaurant((prev) => prev ? { ...prev, ...updatedData } : prev);
          }}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <CategorySheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          title={t("categories.select")}
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title={t("market.select")}
          options={markets}
          onSelect={handleMarketSelect}
        />
        <CategorySheet
          open={tourSheetOpen}
          onOpenChange={setTourSheetOpen}
          title={t("tour.select")}
          options={tourAreas}
          onSelect={handleTourSelect}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(userData) => setUser(userData)}
        />
        <AddRestaurantModal
          isOpen={addRestaurantModalOpen}
          onClose={() => setAddRestaurantModalOpen(false)}
          user={user}
          onSuccess={() => {}}
        />
      </>
    );
  }

  if (currentView === "history") {
    return (
      <>
        <RestaurantHistoryList
          onBack={() => {
            setCurrentView("home");
            setActiveTab("home");
          }}
          onSelectRestaurant={handleRestaurantSelectByPlaceId}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
      </>
    );
  }

  if (currentView === "toilet") {
    return (
      <>
        <ToiletFinder onClose={handleBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <CategorySheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          title={t("categories.select")}
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title={t("market.select")}
          options={markets}
          onSelect={handleMarketSelect}
        />
      </>
    );
  }

  if (currentView === "schedule") {
    return (
      <>
        <ScheduleMain
          onBack={() => {
            setCurrentView("home");
            setActiveTab("home");
          }}
          user={user}
          onLoginClick={() => setAuthModalOpen(true)}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <CategorySheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          title={t("categories.select")}
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title={t("market.select")}
          options={markets}
          onSelect={handleMarketSelect}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(userData) => setUser(userData)}
        />
        <AddRestaurantModal
          isOpen={addRestaurantModalOpen}
          onClose={() => setAddRestaurantModalOpen(false)}
          user={user}
          onSuccess={() => {}}
        />
      </>
    );
  }

  if (currentView === "ai-recommend") {
    return (
      <>
        <AIRecommend
          onBack={handleBack}
          onSelectRestaurant={handleRestaurantSelect}
          timeSlot={timeRecommendation?.timeSlot}
          savedState={aiRecommendState}
          onStateChange={setAiRecommendState}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <CategorySheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          title={t("categories.select")}
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title={t("market.select")}
          options={markets}
          onSelect={handleMarketSelect}
        />
      </>
    );
  }

  if (currentView === "nearby") {
    return (
      <>
        <NearbyRestaurants
          onSelectRestaurant={handleRestaurantSelect}
          onBack={() => {
            setCurrentView("home");
            setActiveTab("home");
          }}
          savedState={nearbyState}
          onStateChange={setNearbyState}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <CategorySheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          title={t("categories.select")}
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title={t("market.select")}
          options={markets}
          onSelect={handleMarketSelect}
        />
        <CategorySheet
          open={tourSheetOpen}
          onOpenChange={setTourSheetOpen}
          title={t("tour.select")}
          options={tourAreas}
          onSelect={handleTourSelect}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(userData) => setUser(userData)}
        />
        <AddRestaurantModal
          isOpen={addRestaurantModalOpen}
          onClose={() => setAddRestaurantModalOpen(false)}
          user={user}
          onSuccess={() => {}}
        />
      </>
    );
  }

  if (currentView === "district-ranking") {
    return (
      <>
        <div className="min-h-screen pb-20">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm safe-area-top">
            <div className="flex items-center gap-2 p-3">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-semibold">{t("home.district_ranking_title")}</h1>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <p className="text-sm text-muted-foreground">
              {t("home.district_ranking_desc")}
            </p>
          </div>

          {/* 지역 랭킹 목록 */}
          <div className="p-4 space-y-2">
            {districtRanking.map((item, index) => {
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`;
              const districtInfo = DISTRICT_INFO[item.district];
              return (
                <button
                  key={item.district}
                  onClick={() => handleDistrictSelect(item.district, item.restaurants)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-card hover:bg-muted transition-colors text-left shadow-sm"
                >
                  <span className={`text-2xl w-10 text-center ${index < 3 ? '' : 'text-muted-foreground text-base font-medium'}`}>
                    {medal}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">
                      {districtInfo?.name || item.district}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {districtInfo?.description?.slice(0, 40)}...
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("home.district_restaurants_count", { count: item.count })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-accent">
                      <span className="text-lg">⭐</span>
                      <span className="font-bold text-lg text-foreground">{item.avgRating.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{t("home.avg_rating")}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(userData) => setUser(userData)}
        />
        <AddRestaurantModal
          isOpen={addRestaurantModalOpen}
          onClose={() => setAddRestaurantModalOpen(false)}
          user={user}
          onSuccess={() => {}}
        />
      </>
    );
  }

  if (currentView === "guide") {
    // 개요 탭 콘텐츠
    const OverviewContent = () => (
      <div className="space-y-6">
        {/* 섹션 1: 타이베이에 대하여 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏙️</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.about_taipei")}</h2>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              {t("guide.about_taipei_desc").split('<b>').map((part: string, i: number) => {
                if (i === 0) return part;
                const [bold, rest] = part.split('</b>');
                return <span key={i}><span className="font-semibold text-foreground">{bold}</span>{rest}</span>;
              })}
            </p>
            <div className="grid gap-3">
              <div className="bg-muted/50 dark:bg-muted rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏛️</span>
                  <span className="font-semibold text-foreground">{t("guide.taipei_city")}</span>
                  <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">{t("guide.taipei_city_districts")}</span>
                </div>
                <p className="text-xs">{t("guide.taipei_city_desc")}</p>
              </div>
              <div className="bg-muted/50 dark:bg-muted rounded-xl p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌿</span>
                  <span className="font-semibold text-foreground">{t("guide.new_taipei_city")}</span>
                  <span className="bg-accent text-accent-foreground text-[10px] px-2 py-0.5 rounded-full">{t("guide.new_taipei_districts")}</span>
                </div>
                <p className="text-xs">{t("guide.new_taipei_desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 섹션 2: 타이베이시 12개 구 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📍</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.taipei_12_districts")}</h2>
          </div>
          <div className="grid gap-2">
            {[
              { key: "zhongzheng", emoji: "🏛️" },
              { key: "daan", emoji: "☕" },
              { key: "xinyi", emoji: "🏙️" },
              { key: "wanhua", emoji: "🛍️" },
              { key: "zhongshan", emoji: "🍸" },
              { key: "shilin", emoji: "🌙" },
              { key: "beitou", emoji: "♨️" },
              { key: "songshan", emoji: "✈️" },
              { key: "datong", emoji: "🏮" },
              { key: "neihu", emoji: "🏢" },
              { key: "nangang", emoji: "🎪" },
              { key: "wenshan", emoji: "🐼" },
            ].map((district) => (
              <div
                key={district.key}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-xl">{district.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{t(`district.${district.key}.name`)}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(`district.${district.key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 3: 타이베이시 주요 여행 명소 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✨</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.taipei_attractions")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "taipei101", emoji: "🗼" },
              { key: "cks_memorial", emoji: "🏛️" },
              { key: "ximending", emoji: "🛍️" },
              { key: "yongkang", emoji: "🥟" },
              { key: "shilin_market", emoji: "🌙" },
              { key: "palace_museum", emoji: "🏺" },
              { key: "beitou_springs", emoji: "♨️" },
            ].map((spot) => (
              <div
                key={spot.key}
                className="bg-muted/50 dark:bg-muted rounded-xl p-3 border border-border"
              >
                <div className="text-2xl mb-1">{spot.emoji}</div>
                <div className="font-semibold text-foreground text-sm">{t(`landmark.${spot.key}.name`)}</div>
                <p className="text-xs text-muted-foreground">{t(`landmark.${spot.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 4: 신베이시 주요 여행 명소 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🌿</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.new_taipei_attractions")}</h2>
          </div>
          <div className="grid gap-3">
            {[
              { key: "yehliu", emoji: "🪨" },
              { key: "jiufen", emoji: "🏮" },
              { key: "shifen", emoji: "🎈" },
              { key: "jinguashi", emoji: "⛏️" },
              { key: "wulai", emoji: "🌊" },
              { key: "sanxia", emoji: "🧱" },
              { key: "bitan", emoji: "🚣" },
              { key: "sanchong", emoji: "🏠" },
            ].map((spot) => (
              <div
                key={spot.key}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 dark:bg-muted border border-border"
              >
                <span className="text-2xl">{spot.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{t(`day_trip.${spot.key}.name`)}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(`day_trip.${spot.key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );

    // 날씨 탭 콘텐츠
    const WeatherContent = () => {
      // Helper to render text with <b> tags as bold spans
      const renderBoldText = (text: string) => {
        const parts = text.split(/(<b>|<\/b>)/);
        let isBold = false;
        return parts.map((part, i) => {
          if (part === "<b>") { isBold = true; return null; }
          if (part === "</b>") { isBold = false; return null; }
          return isBold ? <span key={i} className="font-medium text-foreground">{part}</span> : part;
        });
      };

      return (
      <div className="space-y-6">
        {/* MZ 핵심 요약 카드 */}
        <section className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚡</span>
            <h2 className="text-fluid-lg font-bold">{t("guide.weather_summary_title")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.avg_temp")}</div>
              <div className="font-bold">{t("guide.avg_temp_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.winter_feel")}</div>
              <div className="font-bold">{t("guide.winter_feel_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.must_have")}</div>
              <div className="font-bold">{t("guide.must_have_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.summer_feature")}</div>
              <div className="font-bold">{t("guide.summer_feature_val")}</div>
            </div>
          </div>
          <p className="text-xs mt-3 text-muted-foreground">{t("guide.weather_summary_note")}</p>
        </section>

        {/* 계절별 요약 카드 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🌤️</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.seasonal_weather")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 dark:bg-muted rounded-xl p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🌸</span>
                <span className="font-semibold text-foreground text-sm">{t("guide.spring_label")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("guide.spring_desc")}</p>
              <p className="text-xs text-foreground font-medium mt-1">{t("guide.spring_temp")}</p>
            </div>
            <div className="bg-muted/50 dark:bg-muted rounded-xl p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">☀️</span>
                <span className="font-semibold text-foreground text-sm">{t("guide.summer_label")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("guide.summer_desc")}</p>
              <p className="text-xs text-foreground font-medium mt-1">{t("guide.summer_temp")}</p>
            </div>
            <div className="bg-muted/50 dark:bg-muted rounded-xl p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🍂</span>
                <span className="font-semibold text-foreground text-sm">{t("guide.fall_label")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("guide.fall_desc")}</p>
              <p className="text-xs text-foreground font-medium mt-1">{t("guide.fall_temp")}</p>
            </div>
            <div className="bg-muted/50 dark:bg-muted rounded-xl p-3 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">❄️</span>
                <span className="font-semibold text-foreground text-sm">{t("guide.winter_label")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("guide.winter_desc")}</p>
              <p className="text-xs text-foreground font-medium mt-1">{t("guide.winter_temp")}</p>
            </div>
          </div>
        </section>

        {/* 월별 상세 비교 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📅</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.monthly_comparison")}</h2>
            <span className="text-xs text-muted-foreground">({t("guide.vs_seoul")})</span>
          </div>
          <div className="space-y-2">
            {["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].map((key) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 dark:bg-muted/70">
                <div className="w-12 text-center">
                  <span className="font-bold text-foreground text-sm">{t(`weather.${key}.month`)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{t(`weather.${key}.temp`)}</span>
                    <span className="text-[10px] text-muted-foreground">{t("guide.seoul_equivalent", { month: t(`weather.${key}.seoul`) })}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(`weather.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 계절별 준비물 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎒</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.seasonal_items")}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <span className="text-2xl">❄️</span>
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm mb-2">{t("guide.winter_label")}</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_thin_coat")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_long_sleeve")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_umbrella")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_cardigan")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <span className="text-2xl">🌸</span>
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm mb-2">{t("guide.spring_label")}</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_tshirt")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_cardigan")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_portable_umbrella")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_sunscreen")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <span className="text-2xl">☀️</span>
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm mb-2">{t("guide.summer_label")}</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_cool_clothes")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_hat")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_sunglasses")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_waterproof_shoes")}</span>
                  <span className="bg-destructive/10 dark:bg-destructive/20 px-2.5 py-1 rounded-full text-xs shadow-sm font-medium">{t("guide.item_umbrella_required")}</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <span className="text-2xl">🍂</span>
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm mb-2">{t("guide.fall_label")}</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_layered")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_thin_long_sleeve")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_hat")}</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">{t("guide.item_sunscreen")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 팁 */}
        <section className="bg-accent/10 dark:bg-accent/15 rounded-2xl p-5 shadow-md border border-accent/20 dark:border-accent/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💡</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.weather_tips_title")}</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {["tip_warm", "tip_squall", "tip_typhoon", "tip_ac"].map((tipKey) => (
              <div key={tipKey} className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <p>{renderBoldText(t(`guide.${tipKey}`))}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      );
    };

    // 교통 탭 콘텐츠
    const TransportContent = () => (
      <div className="space-y-6">
        {/* MZ 핵심 요약 카드 */}
        <section className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚡</span>
            <h2 className="text-fluid-lg font-bold">{t("guide.transport_summary_title")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.must_prepare")}</div>
              <div className="font-bold">{t("guide.must_prepare_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.best_transport")}</div>
              <div className="font-bold">{t("guide.best_transport_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.cost")}</div>
              <div className="font-bold">{t("guide.cost_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.difficulty")}</div>
              <div className="font-bold">{t("guide.difficulty_val")}</div>
            </div>
          </div>
          <p className="text-xs mt-3 text-muted-foreground">{t("guide.transport_summary_note")}</p>
        </section>

        {/* 교통 시스템 개요 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🚇</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.transport_overview")}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {t("guide.transport_overview_desc")}
          </p>
          <div className="bg-muted/50 dark:bg-muted rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-primary mb-2">
              <span>💡</span>
              <span className="font-semibold text-sm">{t("guide.transport_tip_label")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("guide.transport_overview_tip")}
            </p>
          </div>
        </section>

        {/* 교통수단 종류 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🚆</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.transport_types")}</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                emoji: "🚇",
                name: t("transport.mrt.name"),
                tag: t("guide.recommend"),
                tagColor: "bg-muted-foreground",
                desc: t("transport.mrt.desc"),
                detail: t("transport.mrt.detail")
              },
              {
                emoji: "🚌",
                name: t("transport.bus.name"),
                tag: t("guide.sub"),
                tagColor: "bg-muted-foreground",
                desc: t("transport.bus.desc"),
                detail: t("transport.bus.detail")
              },
              {
                emoji: "✈️",
                name: t("transport.airport_mrt.name"),
                tag: t("guide.airport_mrt"),
                tagColor: "bg-muted-foreground",
                desc: t("transport.airport_mrt.desc"),
                detail: t("transport.airport_mrt.detail")
              },
              {
                emoji: "🚕",
                name: t("transport.taxi.name"),
                tag: t("guide.convenient"),
                tagColor: "bg-muted-foreground",
                desc: t("transport.taxi.desc"),
                detail: t("transport.taxi.detail")
              },
              {
                emoji: "🚲",
                name: t("transport.youbike.name"),
                tag: t("guide.short_distance"),
                tagColor: "bg-muted-foreground",
                desc: t("transport.youbike.desc"),
                detail: t("transport.youbike.detail")
              },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-2xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground text-sm">{item.name}</span>
                    <span className={`${item.tagColor} text-white text-[10px] px-2 py-0.5 rounded-full`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* EasyCard 사용법 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💳</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.easycard_title")}</h2>
          </div>
          <div className="bg-muted/50 dark:bg-muted rounded-xl p-4 border border-border mb-4">
            <p className="text-sm text-foreground font-medium mb-2">
              {t("guide.easycard_desc")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("guide.easycard_usage")}
            </p>
          </div>

          {/* 구매 장소 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <span>🏪</span> {t("guide.easycard_where")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[t("guide.easycard_place_mrt"), t("guide.easycard_place_airport"), "7-Eleven", "FamilyMart"].map((place) => (
                <span key={place} className="bg-muted px-3 py-1.5 rounded-full text-xs text-foreground">
                  {place}
                </span>
              ))}
            </div>
          </div>

          {/* 사용 방법 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span>📱</span> {t("guide.easycard_how")}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-muted/30 rounded-xl">
                <span className="text-xl">🚇</span>
                <div>
                  <div className="text-xs font-medium text-foreground">{t("transport.mrt.name")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.easycard_mrt_how")}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-muted/30 rounded-xl">
                <span className="text-xl">🚌</span>
                <div>
                  <div className="text-xs font-medium text-foreground">{t("transport.bus.name")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.easycard_bus_how")}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-muted/30 rounded-xl">
                <span className="text-xl">🚲</span>
                <div>
                  <div className="text-xs font-medium text-foreground">{t("transport.youbike.name")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.easycard_youbike_how")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 환불 안내 */}
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-sm">
              <span>💰</span>
              <span className="font-medium text-foreground">{t("guide.easycard_refund")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("guide.easycard_refund_desc")}
            </p>
          </div>
        </section>

        {/* 비용 구조 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.cost_guide")}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚇</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{t("transport.mrt.name")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.cost_mrt_desc")}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">20~65 TWD</div>
                <div className="text-xs text-muted-foreground">{t("guide.cost_mrt_krw")}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚌</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{t("transport.bus.name")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.cost_bus_desc")}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">15 TWD~</div>
                <div className="text-xs text-muted-foreground">{t("guide.cost_bus_krw")}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">✈️</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{t("transport.airport_mrt.name")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.cost_airport_desc")}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">150~160 TWD</div>
                <div className="text-xs text-muted-foreground">{t("guide.cost_airport_krw")}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚲</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{t("transport.youbike.name")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.cost_youbike_desc")}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">~5 TWD</div>
                <div className="text-xs text-muted-foreground">{t("guide.cost_youbike_krw")}</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            💡 {t("guide.cost_easycard_tip")}
          </p>
        </section>

        {/* 환승 시스템 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔄</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.transfer_system")}</h2>
          </div>
          <div className="bg-muted/50 dark:bg-muted rounded-xl p-4 border border-border mb-4">
            <p className="text-sm text-foreground mb-2">
              {t("guide.transfer_auto")}
            </p>
            <p className="text-xs text-muted-foreground">{t("guide.transfer_auto_desc")}</p>
          </div>

          {/* 환승 플로우 */}
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-muted dark:bg-muted rounded-full flex items-center justify-center mb-1">
                <span className="text-xl">🚇</span>
              </div>
              <span className="text-xs text-muted-foreground">{t("transport.mrt.name")}</span>
            </div>
            <div className="flex flex-col items-center px-2">
              <span className="text-primary font-bold text-xs mb-1">{t("guide.transfer_discount")}</span>
              <span className="text-muted-foreground">↔️</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-muted dark:bg-muted rounded-full flex items-center justify-center mb-1">
                <span className="text-xl">🚌</span>
              </div>
              <span className="text-xs text-muted-foreground">{t("transport.bus.name")}</span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 mt-3">
            <p className="text-xs text-muted-foreground text-center">
              {t("guide.transfer_tip")}
            </p>
          </div>
        </section>
      </div>
    );

    // 숙박 탭 콘텐츠
    const AccommodationContent = () => (
      <div className="space-y-6">
        {/* MZ 핵심 요약 카드 */}
        <section className="bg-card rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚡</span>
            <h2 className="text-fluid-lg font-bold">{t("guide.accommodation_summary_title")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.best_area")}</div>
              <div className="font-bold text-sm">{t("guide.best_area_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.budget")}</div>
              <div className="font-bold text-sm">{t("guide.budget_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.core_tip")}</div>
              <div className="font-bold text-sm">{t("guide.core_tip_val")}</div>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">{t("guide.vibe")}</div>
              <div className="font-bold text-sm">{t("guide.vibe_val")}</div>
            </div>
          </div>
          <p className="text-xs mt-3 text-muted-foreground">{t("guide.accommodation_summary_note")}</p>
        </section>

        {/* 숙박 분위기 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏨</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.taipei_accommodation")}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {t("guide.accommodation_vibe_desc")}
          </p>
          <div className="bg-muted/50 dark:bg-muted rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 text-primary mb-2">
              <span>💡</span>
              <span className="font-semibold text-sm">{t("guide.accommodation_vibe_tip_title")}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("guide.accommodation_vibe_tip")}
            </p>
          </div>
        </section>

        {/* 지역별 추천 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📍</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.area_recommend")}</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                emoji: "🛍️",
                name: t("accommodation.ximending.name"),
                tag: t("guide.fun"),
                tagColor: "bg-muted-foreground",
                vibe: t("accommodation.ximending.vibe"),
                pros: t("accommodation.ximending.pros"),
                cons: t("accommodation.ximending.cons"),
                for: t("accommodation.ximending.for")
              },
              {
                emoji: "🚇",
                name: t("accommodation.zhongzheng.name"),
                tag: t("guide.traffic"),
                tagColor: "bg-muted-foreground",
                vibe: t("accommodation.zhongzheng.vibe"),
                pros: t("accommodation.zhongzheng.pros"),
                cons: t("accommodation.zhongzheng.cons"),
                for: t("accommodation.zhongzheng.for")
              },
              {
                emoji: "🏙️",
                name: t("accommodation.xinyi.name"),
                tag: t("guide.stylish"),
                tagColor: "bg-muted-foreground",
                vibe: t("accommodation.xinyi.vibe"),
                pros: t("accommodation.xinyi.pros"),
                cons: t("accommodation.xinyi.cons"),
                for: t("accommodation.xinyi.for")
              },
              {
                emoji: "☕",
                name: t("accommodation.zhongshan.name"),
                tag: t("guide.mood"),
                tagColor: "bg-muted-foreground",
                vibe: t("accommodation.zhongshan.vibe"),
                pros: t("accommodation.zhongshan.pros"),
                cons: t("accommodation.zhongshan.cons"),
                for: t("accommodation.zhongshan.for")
              },
              {
                emoji: "♨️",
                name: t("accommodation.beitou.name"),
                tag: t("guide.healing"),
                tagColor: "bg-muted-foreground",
                vibe: t("accommodation.beitou.vibe"),
                pros: t("accommodation.beitou.pros"),
                cons: t("accommodation.beitou.cons"),
                for: t("accommodation.beitou.for")
              },
            ].map((area) => (
              <div
                key={area.name}
                className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{area.emoji}</span>
                  <span className="font-semibold text-foreground text-sm">{area.name}</span>
                  <span className={`${area.tagColor} text-white text-[10px] px-2 py-0.5 rounded-full`}>
                    {area.tag}
                  </span>
                </div>
                <p className="text-xs text-foreground mb-2">{area.vibe}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-1">
                    <span className="text-primary">✓</span>
                    <span className="text-muted-foreground">{area.pros}</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-muted-foreground">✗</span>
                    <span className="text-muted-foreground">{area.cons}</span>
                  </div>
                </div>
                <p className="text-xs text-primary mt-2">→ {area.for}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 숙소 유형 & 예산 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.accommodation_types")}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎒</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{t("guide.hostel")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.hostel_desc")}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">20~40 USD</div>
                <div className="text-xs text-muted-foreground">{t("guide.hostel_krw")}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">📸</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{t("guide.boutique")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.boutique_desc")}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">60~120 USD</div>
                <div className="text-xs text-muted-foreground">{t("guide.boutique_krw")}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏢</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{t("guide.business")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.business_desc")}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">80~150 USD</div>
                <div className="text-xs text-muted-foreground">{t("guide.business_krw")}</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-muted rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <span className="text-xl">♨️</span>
                <div>
                  <div className="font-medium text-foreground text-sm">{t("guide.hot_spring")}</div>
                  <div className="text-xs text-muted-foreground">{t("guide.hot_spring_desc")}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">150~300 USD</div>
                <div className="text-xs text-muted-foreground">{t("guide.hot_spring_krw")}</div>
              </div>
            </div>
          </div>
          <div className="bg-muted/50 dark:bg-muted rounded-xl p-3 mt-4 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              💡 {t("guide.hostel_quality_tip")}
            </p>
          </div>
        </section>

        {/* 숙소 고르는 팁 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✨</span>
            <h2 className="text-fluid-lg font-bold text-foreground">{t("guide.accommodation_tips")}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 dark:bg-muted rounded-xl">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">1</span>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">{t("guide.tip_mrt_5min")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("guide.tip_mrt_5min_desc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 dark:bg-muted rounded-xl">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">{t("guide.tip_ximending_base")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("guide.tip_ximending_base_desc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 dark:bg-muted rounded-xl">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">3</span>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">{t("guide.tip_nightmarket")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("guide.tip_nightmarket_desc")}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 dark:bg-muted rounded-xl">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">4</span>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">{t("guide.tip_early_booking")}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("guide.tip_early_booking_desc")}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );

    const guideTabs = [
      { id: "overview" as GuideTabType, label: t("guide.tab_overview"), emoji: "🏙️" },
      { id: "weather" as GuideTabType, label: t("guide.tab_weather"), emoji: "🌤️" },
      { id: "transport" as GuideTabType, label: t("guide.tab_transport"), emoji: "🚇" },
      { id: "accommodation" as GuideTabType, label: t("guide.tab_accommodation"), emoji: "🏨" },
    ];

    return (
      <>
        <div className="min-h-screen pb-20 bg-background">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-card shadow-sm border-b border-border safe-area-top">
            <div className="flex items-center gap-3 p-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-secondary hover:bg-muted text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-bold text-foreground text-lg">{t("guide.title")}</h1>
                <p className="text-muted-foreground text-xs">{t("guide.subtitle")}</p>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex bg-muted mx-4 mb-4 rounded-xl p-1">
              {guideTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGuideTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    guideTab === tab.id
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-4">
            {guideTab === "overview" && <OverviewContent />}
            {guideTab === "weather" && <WeatherContent />}
            {guideTab === "transport" && <TransportContent />}
            {guideTab === "accommodation" && <AccommodationContent />}

            {/* 하단 안내 */}
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">
                {t("guide.footer")}
              </p>
            </div>
          </div>
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(userData) => setUser(userData)}
        />
        <AddRestaurantModal
          isOpen={addRestaurantModalOpen}
          onClose={() => setAddRestaurantModalOpen(false)}
          user={user}
          onSuccess={() => {}}
        />
      </>
    );
  }

  if (currentView === "list") {
    return (
      <>
        <RestaurantList
          title={listTitle}
          restaurants={listItems}
          onBack={handleBack}
          onSelect={handleRestaurantSelect}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <CategorySheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          title={t("categories.select")}
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title={t("market.select")}
          options={markets}
          onSelect={handleMarketSelect}
        />
        <CategorySheet
          open={tourSheetOpen}
          onOpenChange={setTourSheetOpen}
          title={t("tour.select")}
          options={tourAreas}
          onSelect={handleTourSelect}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(userData) => setUser(userData)}
        />
        <AddRestaurantModal
          isOpen={addRestaurantModalOpen}
          onClose={() => setAddRestaurantModalOpen(false)}
          user={user}
          onSuccess={() => {}}
        />
      </>
    );
  }

  return (
    <>
      {/* 온보딩 */}
      {showOnboarding && (
        <Onboarding
          onComplete={() => {
            localStorage.setItem("onboarding_completed", "true");
            setShowOnboarding(false);
          }}
        />
      )}

      <div className="min-h-screen pb-20 relative">
        {/* Pull-to-Refresh 인디케이터 */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="absolute left-0 right-0 flex items-center justify-center z-30 pointer-events-none"
            style={{ top: 0, height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px` }}
          >
            <span className={`text-2xl ${isRefreshing ? "animate-bounce" : pullDistance >= 80 ? "scale-110" : "opacity-60"} transition-all`}>
              🍜
            </span>
          </div>
        )}

        {/* 헤더 */}
        <header
          className="bg-card safe-area-top relative z-20 transition-transform border-b border-border"
          style={pullDistance > 0 ? { transform: `translateY(${pullDistance}px)` } : undefined}
        >
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-all"
                title={theme === "dark" ? t("theme.light") : t("theme.dark")}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleLanguage}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-all text-xs font-bold"
                title={language === "ko" ? "English" : "한국어"}
              >
                {language === "ko" ? "EN" : "KO"}
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍜</span>
                <h1 className="text-fluid-xl font-bold text-foreground tracking-wide">
                  {t("home.app_title")}
                </h1>
                <span className="text-2xl">🏯</span>
              </div>
              <span className="text-xs text-muted-foreground font-medium tracking-widest mt-0.5">
                {t("home.app_subtitle")}
              </span>
            </div>
            {/* 로그인/사용자 버튼 */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-all"
                  title={`${user.name}님`}
                >
                  <User className="w-5 h-5" />
                  <ChevronDown className="w-3 h-3 absolute bottom-0 right-0" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 bg-card rounded-lg shadow-xl border border-border min-w-[160px] py-1 z-[100]">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{t("home.user_greeting", { name: user.name })}</p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentView("history");
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      {t("auth.history")}
                    </button>
                    {user?.has_password !== false && (
                      <button
                        onClick={() => {
                          setChangePasswordModalOpen(true);
                          setUserMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                      >
                        <Key className="w-4 h-4" />
                        {t("auth.change_password")}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("common.logout")}
                    </button>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => {
                        setDeleteAccountModalOpen(true);
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 text-destructive"
                    >
                      <UserMinus className="w-4 h-4" />
                      {t("auth.delete_account")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-all"
                title={t("common.login")}
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <div className="p-4 space-y-4 transition-transform" style={pullDistance > 0 ? { transform: `translateY(${pullDistance}px)` } : undefined}>
          {/* 검색바 */}
          <div className="relative" ref={searchRef}>
            <div className={`flex items-center bg-card rounded-xl border-2 transition-colors ${showSuggestions && searchSuggestions.length > 0 ? 'border-primary rounded-b-none' : 'border-transparent focus-within:border-primary'}`}>
              <Search className="w-5 h-5 text-muted-foreground ml-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    handleSearch(searchQuery);
                  }
                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                  }
                }}
                placeholder={t("search.placeholder")}
                className="flex-1 bg-transparent border-none outline-none py-3 px-3 text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="p-2 mr-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* 자동완성 드롭다운 */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-card border-2 border-t-0 border-primary rounded-b-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchSuggestions.map((item, index) => (
                  <button
                    key={`${item.이름}-${index}`}
                    onClick={() => handleSuggestionSelect(item)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-b-0"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{getDisplayName(item, language)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {getDisplayLocation(item, language)}
                        {item.야시장 && ` · ${getDisplayNightMarket(item.야시장, language)}`}
                      </div>
                    </div>
                    {item.카테고리 && (
                      <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground flex-shrink-0">
                        {(() => { const cat = categories.find(c => c.id === item.카테고리); return cat ? t(cat.nameKey) : item.카테고리; })()}
                      </span>
                    )}
                  </button>
                ))}
                {searchSuggestions.length > 0 && (
                  <button
                    onClick={() => handleSearch(searchQuery)}
                    className="w-full px-4 py-3 text-center text-primary font-medium hover:bg-muted/50 transition-colors"
                  >
                    {t("home.search_view_all", { query: searchQuery })}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 시간대별 맛집 추천 */}
          {timeRecommendation.restaurants.length > 0 && (
            <section className="rounded-2xl bg-card p-4 shadow-card border border-border">
              <div>
                <h2 className="text-foreground font-semibold text-base flex items-center gap-2 mb-3">
                  <span className="text-xl">{timeRecommendation.emoji}</span>
                  {t(`time_greeting.${timeRecommendation.timeSlot}`)}
                </h2>
                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {timeRecommendation.restaurants.map((restaurant, index) => (
                      <RestaurantCard
                        key={`time-${restaurant.이름}-${index}`}
                        restaurant={restaurant}
                        variant="horizontal"
                        category={restaurant.카테고리}
                        imageUrl={imageUrls[restaurant.이름]}
                        onClick={() => handleRestaurantSelect(restaurant)}
                      />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </section>
          )}

          {/* Bento Grid: 가이드 + 화장실 + AI 추천 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 여행 가이드 */}
            <button
              onClick={() => {
                setViewHistory(prev => [...prev, currentView]);
                setCurrentView("guide");
                window.scrollTo(0, 0);
              }}
              className="rounded-2xl bg-card border border-border shadow-card p-4 text-left active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">📖</span>
              <h3 className="text-foreground font-bold text-sm mt-2">{t("home.travel_guide")}</h3>
              <p className="text-muted-foreground text-[10px] mt-0.5">{t("home.travel_guide_desc")}</p>
            </button>

            {/* 화장실 찾기 */}
            <button
              onClick={() => {
                setViewHistory(prev => [...prev, currentView]);
                setCurrentView("toilet");
                window.scrollTo(0, 0);
              }}
              className="rounded-2xl bg-card border border-border shadow-card p-4 text-left active:scale-[0.98] transition-transform"
            >
              <span className="text-2xl">🚽</span>
              <h3 className="text-foreground font-bold text-sm mt-2">{t("home.toilet_finder")}</h3>
              <p className="text-muted-foreground text-[10px] mt-0.5">{t("home.toilet_finder_desc")}</p>
            </button>

            {/* AI 맛집 추천 */}
            <button
              onClick={() => {
                setViewHistory(prev => [...prev, currentView]);
                setCurrentView("ai-recommend");
                window.scrollTo(0, 0);
              }}
              className="col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/85 via-primary/70 to-accent/50 p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-2 right-4 text-2xl opacity-20">✨</div>
                <div className="absolute bottom-2 right-12 text-xl opacity-15">🍜</div>
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <span className="text-3xl">🤖</span>
                <div>
                  <h3 className="text-white font-bold text-sm">{t("home.ai_recommend")}</h3>
                  <p className="text-white/80 text-[10px] mt-0.5">{t("home.ai_recommend_desc")}</p>
                </div>
              </div>
            </button>
          </div>

          {/* 카테고리 그리드 */}
          <section className="bg-card rounded-2xl p-4 shadow-card">
            <h2 className="text-fluid-base font-semibold mb-3 text-foreground">{t("home.category_title")}</h2>
            <div className="grid grid-cols-3 gap-2">
              {categories.slice(0, 6).map((category) => (
                <Button
                  key={category.id}
                  variant="secondary"
                  className="flex-col h-auto py-3 px-2 bg-muted hover:bg-muted/80 transition-all hover:scale-[1.03] active:scale-[0.98]"
                  onClick={() => handleCategorySelect(category.id)}
                >
                  <span className="text-xl mb-1">{category.icon}</span>
                  <span className="text-xs">{t(category.nameKey)}</span>
                </Button>
              ))}
            </div>
            {categories.length > 6 && (
              <button
                onClick={() => {
                  setActiveTab("category");
                  setCategorySheetOpen(true);
                }}
                className="w-full mt-3 text-xs text-primary font-medium hover:underline"
              >
                {t("home.view_all_categories")}
              </button>
            )}
          </section>

          {/* 인기 맛집 */}
          <section className="bg-card rounded-xl p-4 shadow-sm">
            <h2 className="text-fluid-base font-semibold mb-3 text-foreground">{t("home.popular_restaurants")}</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {popularRestaurants.map((restaurant, index) => (
                  <RestaurantCard
                    key={`${restaurant.이름}-${index}`}
                    restaurant={restaurant}
                    variant="horizontal"
                    category={restaurant.카테고리}
                    imageUrl={imageUrls[restaurant.이름]}
                    onClick={() => handleRestaurantSelect(restaurant)}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>

          {/* 지역별 맛집 랭킹 */}
          {districtRanking.length > 0 && (
            <section className="bg-card rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-fluid-base font-semibold text-foreground">{t("home.district_ranking_title")}</h2>
                <button
                  onClick={() => {
                    setCurrentView("district-ranking");
                    setActiveTab("home");
                    window.scrollTo(0, 0);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {t("common.more")}
                </button>
              </div>
              <div className="space-y-2">
                {districtRanking.slice(0, 5).map((item, index) => {
                  const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`;
                  const districtInfo = DISTRICT_INFO[item.district];
                  return (
                    <button
                      key={item.district}
                      onClick={() => handleDistrictSelect(item.district, item.restaurants)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <span className={`text-lg w-8 text-center ${index < 3 ? '' : 'text-muted-foreground text-sm'}`}>
                        {medal}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {districtInfo?.name || item.district}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("home.district_restaurants_count", { count: item.count })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-accent">
                        <span className="text-sm">⭐</span>
                        <span className="font-semibold text-foreground">{item.avgRating.toFixed(2)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 야시장별 맛집 */}
          <section className="bg-card rounded-xl p-4 shadow-sm">
            <h2 className="text-fluid-base font-semibold mb-3 text-foreground">{t("home.night_market_section")}</h2>
            <ScrollArea className="w-full mb-3">
              <div className="flex gap-2 pb-2">
                {markets.map((market) => (
                  <Button
                    key={market.id}
                    variant={selectedMarket === market.id ? "default" : "secondary"}
                    size="sm"
                    className="rounded-full transition-all hover:scale-[1.05] active:scale-[0.95]"
                    onClick={() => setSelectedMarket(market.id)}
                  >
                    {t(market.nameKey)}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="space-y-3">
              {marketRestaurants.length > 0 ? (
                marketRestaurants.map((restaurant, index) => (
                  <RestaurantCard
                    key={`${restaurant.이름}-${index}`}
                    restaurant={restaurant}
                    imageUrl={imageUrls[restaurant.이름]}
                    onClick={() => handleRestaurantSelect(restaurant)}
                  />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {t("search.no_results")}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />

      {/* 시트들 */}
      <CategorySheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        title={t("categories.select")}
        options={categories}
        onSelect={handleCategorySelect}
      />
      <CategorySheet
        open={marketSheetOpen}
        onOpenChange={setMarketSheetOpen}
        title={t("market.select")}
        options={markets}
        onSelect={handleMarketSelect}
      />
      <CategorySheet
        open={tourSheetOpen}
        onOpenChange={setTourSheetOpen}
        title={t("tour.select")}
        options={tourAreas}
        onSelect={handleTourSelect}
      />

      {/* 로그인/회원가입 모달 */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(userData) => setUser(userData)}
      />

      {/* 비밀번호 변경 모달 */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />

      {/* 회원탈퇴 모달 */}
      <DeleteAccountModal
        isOpen={deleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
        onSuccess={() => setUser(null)}
        isKakaoUser={user?.has_password === false}
      />

      {/* 맛집 등록 모달 */}
      <AddRestaurantModal
        isOpen={addRestaurantModalOpen}
        onClose={() => setAddRestaurantModalOpen(false)}
        user={user}
        onSuccess={() => {
          // 등록 성공 시 처리 (필요하면 목록 새로고침 등)
        }}
      />
    </>
  );
}
