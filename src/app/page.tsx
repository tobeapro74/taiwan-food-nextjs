"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { User, LogOut, Search, X, MapPin, ChevronDown, Key, UserMinus, History, ArrowLeft } from "lucide-react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BottomNav } from "@/components/bottom-nav";
import { RestaurantCard } from "@/components/restaurant-card";
import { RestaurantList } from "@/components/restaurant-list";
import { RestaurantDetail } from "@/components/restaurant-detail";
import { CategorySheet } from "@/components/category-sheet";
import { AuthModal } from "@/components/auth-modal";
import { ChangePasswordModal } from "@/components/change-password-modal";
import { NearbyRestaurants } from "@/components/nearby-restaurants";
import { AddRestaurantModal } from "@/components/add-restaurant-modal";
import { DeleteAccountModal } from "@/components/delete-account-modal";
import { RestaurantHistoryList } from "@/components/restaurant-history";
import { ToiletFinder } from "@/components/toilet-finder";
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
} from "@/data/taiwan-food";
import { getRestaurantDistrict, isValidDistrict, DISTRICT_INFO } from "@/lib/district-utils";

type View = "home" | "list" | "detail" | "nearby" | "history" | "toilet" | "district-ranking" | "guide";
type TabType = "home" | "category" | "market" | "tour" | "places" | "nearby" | "add";
type GuideTabType = "overview" | "weather" | "transport" | "accommodation";

interface UserInfo {
  id: number;
  name: string;
  profile_image?: string;
  is_admin: boolean;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [currentView, setCurrentView] = useState<View>("home");
  const [viewHistory, setViewHistory] = useState<View[]>([]); // 네비게이션 스택
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [listTitle, setListTitle] = useState("");
  const [listItems, setListItems] = useState<Restaurant[]>([]);

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

  // 지역 클릭 핸들러
  const handleDistrictSelect = useCallback((district: string, restaurants: Restaurant[]) => {
    const districtInfo = DISTRICT_INFO[district];
    setListTitle(`${districtInfo?.name || district} 맛집`);
    setListItems(restaurants);
    setViewHistory(prev => [...prev, currentView]); // 현재 화면을 스택에 push
    setCurrentView("list");
    setActiveTab("home");
    window.scrollTo(0, 0);
  }, [currentView]);

  // 검색 처리
  const handleSearch = useCallback((query: string) => {
    if (query.trim().length >= 1) {
      const results = searchRestaurants(query);
      setListTitle(`"${query}" 검색 결과 (${results.length}건)`);
      setListItems(results);
      setCurrentView("list");
      setActiveTab("home");
      setShowSuggestions(false);
    }
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
      if (!user) {
        setAuthModalOpen(true);
      } else if (user.is_admin || user.name === "박병철") {
        setAddRestaurantModalOpen(true);
      }
    } else if (tab === "category") {
      setCategorySheetOpen(true);
    } else if (tab === "market") {
      setMarketSheetOpen(true);
    } else if (tab === "tour") {
      setTourSheetOpen(true);
    } else if (tab === "places") {
      setListTitle("갈만한 곳");
      setListItems(getPlaces());
      setCurrentView("list");
      setActiveTab("places");
    }
  };

  // 카테고리 선택 (사용자 등록 맛집도 포함)
  const handleCategorySelect = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    setListTitle(categoryId === "전체" ? "전체 맛집" : `${category?.name || categoryId} 맛집`);

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
            1: "저렴 (NT$100 이하)",
            2: "보통 (NT$100~300)",
            3: "비쌈 (NT$300~600)",
            4: "매우 비쌈 (NT$600 이상)",
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
  };

  // 야시장 선택
  const handleMarketSelect = (marketId: string) => {
    const market = markets.find((m) => m.id === marketId);
    setListTitle(marketId === "전체" ? "전체 야시장" : market?.id || marketId);
    setListItems(getRestaurantsByMarket(marketId));
    setCurrentView("list");
    setActiveTab("market");
  };

  // 도심투어 선택
  const handleTourSelect = (areaId: string) => {
    const area = tourAreas.find((a) => a.id === areaId);
    setListTitle(areaId === "전체" ? "전체 도심투어" : `${area?.name || areaId} 맛집 & 카페`);
    setListItems(getRestaurantsByTour(areaId));
    setCurrentView("list");
    setActiveTab("tour");
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
          title="카테고리 선택"
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title="야시장 선택"
          options={markets}
          onSelect={handleMarketSelect}
        />
        <CategorySheet
          open={tourSheetOpen}
          onOpenChange={setTourSheetOpen}
          title="도심투어 지역"
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
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} user={user} />
        <CategorySheet
          open={categorySheetOpen}
          onOpenChange={setCategorySheetOpen}
          title="카테고리 선택"
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title="야시장 선택"
          options={markets}
          onSelect={handleMarketSelect}
        />
        <CategorySheet
          open={tourSheetOpen}
          onOpenChange={setTourSheetOpen}
          title="도심투어 지역"
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
              <h1 className="font-semibold">📍 전체 지역별 맛집 랭킹</h1>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <p className="text-sm text-muted-foreground">
              타이베이 12개 구의 평균 평점 순위입니다. 지역을 클릭하면 해당 지역의 맛집을 볼 수 있어요.
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
                      {item.count}개 맛집
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-amber-500">
                      <span className="text-lg">⭐</span>
                      <span className="font-bold text-lg text-foreground">{item.avgRating.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">평균 평점</div>
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
            <h2 className="text-lg font-bold text-foreground">타이베이에 대하여</h2>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p>
              타이베이는 크게 <span className="font-semibold text-foreground">타이베이시(Taipei City)</span>와{" "}
              <span className="font-semibold text-foreground">신베이시(New Taipei City)</span>로 나뉩니다.
            </p>
            <div className="grid gap-3">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🏛️</span>
                  <span className="font-semibold text-foreground">타이베이시</span>
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">12개 구</span>
                </div>
                <p className="text-xs">대만의 정치·경제·문화 중심지로, 관광 명소와 맛집이 집중되어 있습니다.</p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌿</span>
                  <span className="font-semibold text-foreground">신베이시</span>
                  <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">29개 구</span>
                </div>
                <p className="text-xs">타이베이를 완전히 둘러싸고 있는 광역 특별시로, 생각보다 규모가 커요. 다양한 성격의 지역들이 모여 있어 자연·전통·근교 여행지가 풍부하고, 당일치기 코스로 인기가 높습니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 섹션 2: 타이베이시 12개 구 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📍</span>
            <h2 className="text-lg font-bold text-foreground">타이베이시 12개 구</h2>
          </div>
          <div className="grid gap-2">
            {[
              { name: "중정구", emoji: "🏛️", desc: "중정기념당과 타이베이 메인스테이션이 위치. 교통과 관광의 중심지." },
              { name: "다안구", emoji: "☕", desc: "융캉제가 있어 카페와 맛집이 밀집된 감성 거리. 젊은 여행자들에게 인기." },
              { name: "신이구", emoji: "🏙️", desc: "타이베이 101타워와 대형 쇼핑몰. 야경과 쇼핑 명소." },
              { name: "완화구", emoji: "🛍️", desc: "시먼딩이 위치한 패션·문화 거리. 용산사 같은 전통 명소도 함께." },
              { name: "중산구", emoji: "🍸", desc: "중산 카페거리와 세련된 바·호텔. 감성 여행과 나이트라이프에 적합." },
              { name: "스린구", emoji: "🌙", desc: "스린 야시장과 국립고궁박물원. 먹거리와 문화 체험 동시에." },
              { name: "베이터우구", emoji: "♨️", desc: "온천으로 유명. 온천 호텔·도서관·박물관이 있어 힐링 여행에 적합." },
              { name: "송산구", emoji: "✈️", desc: "송산공항과 라오허제 야시장. 교통 편리하고 야시장 탐방에 좋음." },
              { name: "다퉁구", emoji: "🏮", desc: "디화제가 있어 전통시장과 한약방. 대만의 정취를 느낄 수 있음." },
              { name: "네이후구", emoji: "🏢", desc: "IT 기업과 주거지역. 대형 쇼핑몰과 호수 공원으로 현지 생활 체험." },
              { name: "난강구", emoji: "🎪", desc: "난강 전시센터와 IT 산업 단지. 박람회·콘서트가 자주 열리는 곳." },
              { name: "원산구", emoji: "🐼", desc: "타이베이 동물원과 마오콩 곤돌라. 가족 단위 관광객에게 인기." },
            ].map((district) => (
              <div
                key={district.name}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-xl">{district.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{district.name}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{district.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 3: 타이베이시 주요 여행 명소 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✨</span>
            <h2 className="text-lg font-bold text-foreground">타이베이시 주요 명소</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "타이베이 101", emoji: "🗼", desc: "대만의 랜드마크" },
              { name: "중정기념당", emoji: "🏛️", desc: "대만 현대사의 상징" },
              { name: "시먼딩", emoji: "🛍️", desc: "젊음의 패션 거리" },
              { name: "융캉제", emoji: "🥟", desc: "딘타이펑 본점 위치" },
              { name: "스린 야시장", emoji: "🌙", desc: "대만 최대 야시장" },
              { name: "국립고궁박물원", emoji: "🏺", desc: "세계적 박물관" },
              { name: "베이터우 온천", emoji: "♨️", desc: "힐링 온천 명소" },
            ].map((spot) => (
              <div
                key={spot.name}
                className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-3 border border-amber-100 dark:border-amber-900/30"
              >
                <div className="text-2xl mb-1">{spot.emoji}</div>
                <div className="font-semibold text-foreground text-sm">{spot.name}</div>
                <p className="text-xs text-muted-foreground">{spot.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 섹션 4: 신베이시 주요 여행 명소 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🌿</span>
            <h2 className="text-lg font-bold text-foreground">신베이시 주요 명소</h2>
          </div>
          <div className="grid gap-3">
            {[
              { name: "예류지질공원", emoji: "🪨", desc: "기암괴석과 '여왕 머리 바위'로 유명한 해안 지질 공원" },
              { name: "지우펀 옛거리", emoji: "🏮", desc: "언덕 위 찻집과 야경이 매력적인 산간 마을" },
              { name: "스펀 폭포", emoji: "🎈", desc: "철로 위 스카이랜턴 체험, '대만의 나이아가라' 폭포" },
              { name: "진과스 황금박물관", emoji: "⛏️", desc: "옛 금광 마을을 테마로 한 역사문화 여행지" },
              { name: "우라이", emoji: "🌊", desc: "원주민 문화와 온천, 폭포가 함께 있는 힐링 여행지" },
              { name: "산샤 옛거리", emoji: "🧱", desc: "붉은 벽돌 아케이드와 전통 간식이 있는 거리" },
              { name: "비탄 풍경구", emoji: "🚣", desc: "강변 자전거·보트 체험, 야간 조명으로 유명한 데이트 코스" },
              { name: "산충구", emoji: "🏠", desc: "타이베이와 가까운 주거·상업 지역. 숙소 거점으로 적합" },
            ].map((spot) => (
              <div
                key={spot.name}
                className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-100 dark:border-green-900/30"
              >
                <span className="text-2xl">{spot.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{spot.name}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{spot.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );

    // 날씨 탭 콘텐츠
    const WeatherContent = () => (
      <div className="space-y-6">
        {/* MZ 핵심 요약 카드 */}
        <section className="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚡</span>
            <h2 className="text-lg font-bold">MZ를 위한 핵심 요약</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">연평균 기온</div>
              <div className="font-bold">서울보다 따뜻</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">겨울 체감</div>
              <div className="font-bold">서울 봄 날씨</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">필수 준비물</div>
              <div className="font-bold">휴대용 우산</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">여름 특징</div>
              <div className="font-bold">스콜 + 태풍</div>
            </div>
          </div>
          <p className="text-xs mt-3 opacity-90">1년 내내 패딩 필요 없어요! 대신 우산은 챙기세요</p>
        </section>

        {/* 계절별 요약 카드 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🌤️</span>
            <h2 className="text-lg font-bold text-foreground">계절별 날씨</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-pink-50 to-rose-100 dark:from-pink-950/30 dark:to-rose-950/30 rounded-xl p-3 border border-pink-200 dark:border-pink-900/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🌸</span>
                <span className="font-semibold text-foreground text-sm">봄 (3~5월)</span>
              </div>
              <p className="text-xs text-muted-foreground">서울 초여름 느낌</p>
              <p className="text-xs text-foreground font-medium mt-1">16~29°C</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl p-3 border border-orange-200 dark:border-orange-900/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">☀️</span>
                <span className="font-semibold text-foreground text-sm">여름 (6~9월)</span>
              </div>
              <p className="text-xs text-muted-foreground">서울 한여름과 동일</p>
              <p className="text-xs text-foreground font-medium mt-1">24~34°C</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl p-3 border border-amber-200 dark:border-amber-900/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🍂</span>
                <span className="font-semibold text-foreground text-sm">가을 (10~11월)</span>
              </div>
              <p className="text-xs text-muted-foreground">서울 늦봄~초여름</p>
              <p className="text-xs text-foreground font-medium mt-1">19~28°C</p>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950/30 dark:to-blue-950/30 rounded-xl p-3 border border-sky-200 dark:border-sky-900/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">❄️</span>
                <span className="font-semibold text-foreground text-sm">겨울 (12~2월)</span>
              </div>
              <p className="text-xs text-muted-foreground">서울 봄 같은 날씨</p>
              <p className="text-xs text-foreground font-medium mt-1">13~20°C</p>
            </div>
          </div>
        </section>

        {/* 월별 상세 비교 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📅</span>
            <h2 className="text-lg font-bold text-foreground">월별 상세 비교</h2>
            <span className="text-xs text-muted-foreground">(vs 서울)</span>
          </div>
          <div className="space-y-2">
            {[
              { month: "1월", temp: "13~19°C", seoul: "4월", desc: "서울보다 훨씬 따뜻, 봄 같은 겨울", color: "bg-sky-100 dark:bg-sky-900/30" },
              { month: "2월", temp: "14~20°C", seoul: "4~5월", desc: "초봄~늦봄 날씨, 비 자주 옴", color: "bg-sky-100 dark:bg-sky-900/30" },
              { month: "3월", temp: "16~22°C", seoul: "5월", desc: "서울의 늦봄과 유사", color: "bg-pink-100 dark:bg-pink-900/30" },
              { month: "4월", temp: "19~26°C", seoul: "6월", desc: "서울 초여름 느낌", color: "bg-pink-100 dark:bg-pink-900/30" },
              { month: "5월", temp: "22~29°C", seoul: "7월", desc: "본격 여름 시작, 장마철 비슷", color: "bg-pink-100 dark:bg-pink-900/30" },
              { month: "6월", temp: "24~32°C", seoul: "7~8월", desc: "서울 한여름과 동일, 습도↑", color: "bg-orange-100 dark:bg-orange-900/30" },
              { month: "7월", temp: "26~34°C", seoul: "8월", desc: "서울 가장 더운 시기와 같음", color: "bg-orange-100 dark:bg-orange-900/30" },
              { month: "8월", temp: "26~33°C", seoul: "8월", desc: "서울 늦여름과 동일, 태풍 시즌", color: "bg-orange-100 dark:bg-orange-900/30" },
              { month: "9월", temp: "24~31°C", seoul: "7월", desc: "서울보다 늦게까지 여름 지속", color: "bg-orange-100 dark:bg-orange-900/30" },
              { month: "10월", temp: "22~28°C", seoul: "6월", desc: "서울 초여름 같은 가을", color: "bg-amber-100 dark:bg-amber-900/30" },
              { month: "11월", temp: "19~23°C", seoul: "5월", desc: "서울 늦봄 같은 가을", color: "bg-amber-100 dark:bg-amber-900/30" },
              { month: "12월", temp: "15~20°C", seoul: "4월", desc: "서울 봄 같은 겨울", color: "bg-sky-100 dark:bg-sky-900/30" },
            ].map((item) => (
              <div key={item.month} className={`flex items-center gap-3 p-3 rounded-xl ${item.color}`}>
                <div className="w-12 text-center">
                  <span className="font-bold text-foreground text-sm">{item.month}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{item.temp}</span>
                    <span className="text-[10px] text-muted-foreground">≈ 서울 {item.seoul}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 계절별 준비물 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎒</span>
            <h2 className="text-lg font-bold text-foreground">계절별 준비물</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900/30">
              <span className="text-2xl">❄️</span>
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm mb-2">겨울 (12~2월)</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">얇은 코트</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">긴팔</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">우산</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">가디건</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-pink-50 dark:bg-pink-950/30 rounded-xl border border-pink-100 dark:border-pink-900/30">
              <span className="text-2xl">🌸</span>
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm mb-2">봄 (3~5월)</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">반팔</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">가디건</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">휴대용 우산</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">선크림</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/30">
              <span className="text-2xl">☀️</span>
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm mb-2">여름 (6~9월)</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">시원한 옷</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">모자</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">선글라스</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">방수 신발</span>
                  <span className="bg-red-100 dark:bg-red-900/30 px-2.5 py-1 rounded-full text-xs shadow-sm font-medium">우산 필수!</span>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/30">
              <span className="text-2xl">🍂</span>
              <div className="flex-1">
                <div className="font-medium text-foreground text-sm mb-2">가을 (10~11월)</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">레이어드</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">얇은 긴팔</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">모자</span>
                  <span className="bg-white dark:bg-card px-2.5 py-1 rounded-full text-xs shadow-sm">선크림</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 팁 */}
        <section className="bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-950/50 dark:to-amber-950/50 rounded-2xl p-5 shadow-md border border-yellow-200 dark:border-yellow-900/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💡</span>
            <h2 className="text-lg font-bold text-foreground">알아두면 좋은 팁</h2>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <p>타이베이는 <span className="font-medium text-foreground">1년 내내 서울보다 따뜻</span>해요. 겨울에도 패딩 필요 없어요!</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <p>여름엔 갑자기 쏟아지는 <span className="font-medium text-foreground">스콜(소나기)</span>이 많아요. 휴대용 우산 필수!</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <p>8~9월은 <span className="font-medium text-foreground">태풍 시즌</span>이에요. 여행 전 날씨 확인하세요.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <p>실내 에어컨이 세서 <span className="font-medium text-foreground">여름에도 얇은 겉옷</span> 챙기면 좋아요.</p>
            </div>
          </div>
        </section>
      </div>
    );

    // 교통 탭 콘텐츠
    const TransportContent = () => (
      <div className="space-y-6">
        {/* MZ 핵심 요약 카드 */}
        <section className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚡</span>
            <h2 className="text-lg font-bold">MZ를 위한 핵심 요약</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">필수 준비물</div>
              <div className="font-bold">EasyCard 하나면 끝</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">가장 편한 이동</div>
              <div className="font-bold">MRT 중심 이동</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">비용</div>
              <div className="font-bold">한국보다 저렴</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">초보자 난이도</div>
              <div className="font-bold">매우 쉬움</div>
            </div>
          </div>
          <p className="text-xs mt-3 opacity-90">서울 지하철보다 단순하고, 영어 안내도 충분해요!</p>
        </section>

        {/* 교통 시스템 개요 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🚇</span>
            <h2 className="text-lg font-bold text-foreground">교통 시스템 개요</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            타이베이는 <span className="font-semibold text-foreground">MRT(지하철)</span>를 중심으로
            버스·택시·공유자전거·공항철도가 촘촘하게 연결된 구조예요.
            대부분의 관광지는 MRT만으로도 이동 가능합니다.
          </p>
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
              <span>💡</span>
              <span className="font-semibold text-sm">알아두면 좋은 점</span>
            </div>
            <p className="text-xs text-muted-foreground">
              MRT는 1996년 개통 후 꾸준히 확장되어 현재 131개 역으로 구성된 대규모 네트워크예요.
            </p>
          </div>
        </section>

        {/* 교통수단 종류 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🚆</span>
            <h2 className="text-lg font-bold text-foreground">교통수단 종류</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                emoji: "🚇",
                name: "MRT (Taipei Metro)",
                tag: "추천",
                tagColor: "bg-green-500",
                desc: "가장 빠르고 편한 이동 수단. 주요 관광지 대부분 연결",
                detail: "운영시간: 06:00~00:00 · 중국어/영어 안내"
              },
              {
                emoji: "🚌",
                name: "버스",
                tag: "보조",
                tagColor: "bg-blue-500",
                desc: "MRT가 닿지 않는 지역까지 이동 가능",
                detail: "EasyCard로 환승 자동 처리"
              },
              {
                emoji: "✈️",
                name: "공항 MRT",
                tag: "공항↔시내",
                tagColor: "bg-purple-500",
                desc: "타오위안 공항에서 시내까지 약 35~40분",
                detail: "일반/급행 열차 선택 가능"
              },
              {
                emoji: "🚕",
                name: "택시",
                tag: "편리",
                tagColor: "bg-yellow-500",
                desc: "한국보다 저렴한 편, 야간 이동에 유용",
                detail: "대부분 카드·EasyCard 결제 가능"
              },
              {
                emoji: "🚲",
                name: "YouBike (공유자전거)",
                tag: "단거리",
                tagColor: "bg-teal-500",
                desc: "MRT역 주변에 거의 항상 있음",
                detail: "짧은 거리 이동에 최고, 첫 30분 약 5 TWD"
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
            <h2 className="text-lg font-bold text-foreground">EasyCard (이지카드)</h2>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl p-4 border border-orange-100 dark:border-orange-900/30 mb-4">
            <p className="text-sm text-foreground font-medium mb-2">
              타이베이 교통의 핵심!
            </p>
            <p className="text-xs text-muted-foreground">
              MRT·버스·YouBike·편의점·관광지까지 모두 결제 가능해요.
            </p>
          </div>

          {/* 구매 장소 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <span>🏪</span> 구매 장소
            </h3>
            <div className="flex flex-wrap gap-2">
              {["MRT역", "공항", "7-Eleven", "FamilyMart"].map((place) => (
                <span key={place} className="bg-muted px-3 py-1.5 rounded-full text-xs text-foreground">
                  {place}
                </span>
              ))}
            </div>
          </div>

          {/* 사용 방법 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span>📱</span> 사용 방법
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <span className="text-xl">🚇</span>
                <div>
                  <div className="text-xs font-medium text-foreground">MRT</div>
                  <div className="text-xs text-muted-foreground">개찰구에서 탭 인 → 탭 아웃</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-xl">
                <span className="text-xl">🚌</span>
                <div>
                  <div className="text-xs font-medium text-foreground">버스</div>
                  <div className="text-xs text-muted-foreground">탑승 시 탭 + 하차 시 탭</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl">
                <span className="text-xl">🚲</span>
                <div>
                  <div className="text-xs font-medium text-foreground">YouBike</div>
                  <div className="text-xs text-muted-foreground">단말기에 카드 태그 후 대여/반납</div>
                </div>
              </div>
            </div>
          </div>

          {/* 환불 안내 */}
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-sm">
              <span>💰</span>
              <span className="font-medium text-foreground">환불</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              공항·MRT역에서 잔액 환불 가능 (소액 수수료 있음)
            </p>
          </div>
        </section>

        {/* 비용 구조 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-lg font-bold text-foreground">비용 가이드</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚇</span>
                <div>
                  <div className="font-medium text-foreground text-sm">MRT</div>
                  <div className="text-xs text-muted-foreground">거리 기반 요금제</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">20~65 TWD</div>
                <div className="text-xs text-muted-foreground">약 800~2,600원</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-100 dark:border-green-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚌</span>
                <div>
                  <div className="font-medium text-foreground text-sm">버스</div>
                  <div className="text-xs text-muted-foreground">기본 요금</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">15 TWD~</div>
                <div className="text-xs text-muted-foreground">약 600원~</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-100 dark:border-purple-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">✈️</span>
                <div>
                  <div className="font-medium text-foreground text-sm">공항 MRT</div>
                  <div className="text-xs text-muted-foreground">일반 / 급행</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">150~160 TWD</div>
                <div className="text-xs text-muted-foreground">약 6,000~6,400원</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-xl border border-teal-100 dark:border-teal-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚲</span>
                <div>
                  <div className="font-medium text-foreground text-sm">YouBike</div>
                  <div className="text-xs text-muted-foreground">첫 30분</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">~5 TWD</div>
                <div className="text-xs text-muted-foreground">약 200원</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            💡 EasyCard 사용 시 소폭 할인 적용
          </p>
        </section>

        {/* 환승 시스템 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔄</span>
            <h2 className="text-lg font-bold text-foreground">환승 시스템</h2>
          </div>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/30 mb-4">
            <p className="text-sm text-foreground mb-2">
              EasyCard로 결제하면 <span className="font-bold">환승 할인 자동 적용!</span>
            </p>
            <p className="text-xs text-muted-foreground">별도 설정 없이 자동으로 처리돼요.</p>
          </div>

          {/* 환승 플로우 */}
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-1">
                <span className="text-xl">🚇</span>
              </div>
              <span className="text-xs text-muted-foreground">MRT</span>
            </div>
            <div className="flex flex-col items-center px-2">
              <span className="text-green-500 font-bold text-xs mb-1">할인</span>
              <span className="text-muted-foreground">↔️</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-1">
                <span className="text-xl">🚌</span>
              </div>
              <span className="text-xs text-muted-foreground">버스</span>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-3 mt-3">
            <p className="text-xs text-muted-foreground text-center">
              MRT 노선 간 환승도 직관적이고, 역 내부 안내가 잘 되어 있어 초행자도 헤매기 어려워요!
            </p>
          </div>
        </section>
      </div>
    );

    // 숙박 탭 콘텐츠
    const AccommodationContent = () => (
      <div className="space-y-6">
        {/* MZ 핵심 요약 카드 */}
        <section className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚡</span>
            <h2 className="text-lg font-bold">MZ를 위한 핵심 요약</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">최적 지역</div>
              <div className="font-bold text-sm">시먼딩·중정구</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">예산</div>
              <div className="font-bold text-sm">호스텔 2~4만원</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">핵심 팁</div>
              <div className="font-bold text-sm">MRT 5분 거리</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-3">
              <div className="text-xs opacity-80 mb-1">분위기</div>
              <div className="font-bold text-sm">안전·가성비 좋음</div>
            </div>
          </div>
          <p className="text-xs mt-3 opacity-90">주말·연휴는 미리 예약! 현지인도 많이 여행해요</p>
        </section>

        {/* 숙박 분위기 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🏨</span>
            <h2 className="text-lg font-bold text-foreground">타이베이 숙박 분위기</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            타이베이는 <span className="font-semibold text-foreground">가성비 좋은 호스텔</span>부터
            감성 호텔, 온천 리조트까지 선택 폭이 넓은 도시예요.
          </p>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 border border-purple-100 dark:border-purple-900/30">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
              <span>💡</span>
              <span className="font-semibold text-sm">알아두세요</span>
            </div>
            <p className="text-xs text-muted-foreground">
              대부분의 지역이 MRT 접근성이 좋아서 &apos;어느 역 근처냐&apos;가 숙소 퀄리티만큼 중요해요!
            </p>
          </div>
        </section>

        {/* 지역별 추천 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📍</span>
            <h2 className="text-lg font-bold text-foreground">지역별 추천</h2>
          </div>
          <div className="space-y-3">
            {[
              {
                emoji: "🛍️",
                name: "시먼딩 (Ximending)",
                tag: "재미",
                tagColor: "bg-pink-500",
                vibe: "타이베이의 '홍대' 느낌",
                pros: "쇼핑·야식·야경 최고",
                cons: "조용한 분위기 X",
                for: "활기찬 여행 원하는 MZ"
              },
              {
                emoji: "🚇",
                name: "중정구 (Zhongzheng)",
                tag: "교통",
                tagColor: "bg-blue-500",
                vibe: "타이베이 메인역 중심",
                pros: "공항MRT·고속철·지하철 연결",
                cons: "관광지 감성 약함",
                for: "첫 방문, 일정 짜기 편함"
              },
              {
                emoji: "🏙️",
                name: "신이 (Xinyi)",
                tag: "세련",
                tagColor: "bg-indigo-500",
                vibe: "타이베이 101 주변",
                pros: "깔끔·안전·고급 쇼핑몰",
                cons: "가격대 높은 편",
                for: "세련된 분위기 원하는 MZ"
              },
              {
                emoji: "☕",
                name: "중산 (Zhongshan)",
                tag: "감성",
                tagColor: "bg-amber-500",
                vibe: "카페·바 밀집 지역",
                pros: "힙한 분위기, 조용+편리",
                cons: "관광지 접근성 중간",
                for: "감성 카페 좋아하는 MZ"
              },
              {
                emoji: "♨️",
                name: "베이터우 (Beitou)",
                tag: "힐링",
                tagColor: "bg-teal-500",
                vibe: "온천 호텔·리조트 밀집",
                pros: "조용하고 자연친화적",
                cons: "시내 관광에는 비효율적",
                for: "휴식 중심 여행"
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
                    <span className="text-green-500">✓</span>
                    <span className="text-muted-foreground">{area.pros}</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-red-400">✗</span>
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
            <h2 className="text-lg font-bold text-foreground">숙소 유형 & 예산</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-100 dark:border-green-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">🎒</span>
                <div>
                  <div className="font-medium text-foreground text-sm">호스텔</div>
                  <div className="text-xs text-muted-foreground">깔끔·가성비·공용 공간</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">20~40 USD</div>
                <div className="text-xs text-muted-foreground">약 2~5만원</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 rounded-xl border border-pink-100 dark:border-pink-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">📸</span>
                <div>
                  <div className="font-medium text-foreground text-sm">부티크 호텔</div>
                  <div className="text-xs text-muted-foreground">감성·사진 맛집</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">60~120 USD</div>
                <div className="text-xs text-muted-foreground">약 8~16만원</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">🏢</span>
                <div>
                  <div className="font-medium text-foreground text-sm">비즈니스 호텔</div>
                  <div className="text-xs text-muted-foreground">깔끔·실용·교통 편리</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">80~150 USD</div>
                <div className="text-xs text-muted-foreground">약 10~20만원</div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 rounded-xl border border-teal-100 dark:border-teal-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">♨️</span>
                <div>
                  <div className="font-medium text-foreground text-sm">온천 리조트</div>
                  <div className="text-xs text-muted-foreground">힐링·프라이빗</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">150~300 USD</div>
                <div className="text-xs text-muted-foreground">약 20~40만원</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 mt-4 border border-green-100 dark:border-green-900/30">
            <p className="text-xs text-muted-foreground text-center">
              💡 타이베이는 호스텔 퀄리티가 특히 좋아서 가성비 숙소도 만족도 높아요!
            </p>
          </div>
        </section>

        {/* 숙소 고르는 팁 */}
        <section className="bg-white dark:bg-card rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✨</span>
            <h2 className="text-lg font-bold text-foreground">숙소 고르는 팁</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">1</span>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">MRT역 도보 5분 이내</div>
                <p className="text-xs text-muted-foreground mt-1">
                  타이베이는 MRT 중심 도시! 역과의 거리 = 여행 편의성
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-pink-50 dark:bg-pink-950/30 rounded-xl">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">시먼딩 or 중정구 베이스</div>
                <p className="text-xs text-muted-foreground mt-1">
                  첫 방문이라면 가장 스트레스 없는 선택!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">3</span>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">야시장·카페 동선 고려</div>
                <p className="text-xs text-muted-foreground mt-1">
                  타이베이는 밤이 더 재밌는 도시! 숙소 주변 상권 중요
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-xl">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">4</span>
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">주말·연휴는 미리 예약</div>
                <p className="text-xs text-muted-foreground mt-1">
                  현지 여행객도 많아 가격이 오르고 방이 빨리 차요
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );

    const guideTabs = [
      { id: "overview" as GuideTabType, label: "개요", emoji: "🏙️" },
      { id: "weather" as GuideTabType, label: "날씨", emoji: "🌤️" },
      { id: "transport" as GuideTabType, label: "교통", emoji: "🚇" },
      { id: "accommodation" as GuideTabType, label: "숙박", emoji: "🏨" },
    ];

    return (
      <>
        <div className="min-h-screen pb-20 bg-gradient-to-b from-amber-50 to-orange-50 dark:from-background dark:to-background">
          {/* 헤더 */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg safe-area-top">
            <div className="flex items-center gap-3 p-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-bold text-white text-lg">📖 타이베이 여행 가이드</h1>
                <p className="text-white/80 text-xs">대만 타이베이 완벽 정리</p>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex bg-white/10 mx-4 mb-4 rounded-xl p-1">
              {guideTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGuideTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    guideTab === tab.id
                      ? "bg-white text-amber-600 shadow-md"
                      : "text-white/90 hover:bg-white/10"
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
                🧳 즐거운 타이베이 여행 되세요!
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
          title="카테고리 선택"
          options={categories}
          onSelect={handleCategorySelect}
        />
        <CategorySheet
          open={marketSheetOpen}
          onOpenChange={setMarketSheetOpen}
          title="야시장 선택"
          options={markets}
          onSelect={handleMarketSelect}
        />
        <CategorySheet
          open={tourSheetOpen}
          onOpenChange={setTourSheetOpen}
          title="도심투어 지역"
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
      <div className="min-h-screen pb-20">
        {/* 헤더 */}
        <header className="bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 safe-area-top relative z-20">
          {/* 배경 장식 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="absolute top-2 right-10 w-16 h-16 bg-yellow-300/20 rounded-full blur-lg" />
            <div className="absolute -bottom-2 right-1/4 w-20 h-20 bg-white/5 rounded-full blur-xl" />
          </div>
          <div className="px-4 py-4 flex items-center justify-between relative z-10">
            <div className="w-10" /> {/* 왼쪽 여백 */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl drop-shadow-lg">🍜</span>
                <h1 className="text-xl font-bold text-white drop-shadow-md tracking-wide">
                  대만맛집
                </h1>
                <span className="text-2xl drop-shadow-lg">🏯</span>
              </div>
              <span className="text-xs text-white/80 font-medium tracking-widest mt-0.5">
                TAIPEI FOOD GUIDE
              </span>
            </div>
            {/* 로그인/사용자 버튼 */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/35 transition-all shadow-lg border border-white/20"
                  title={`${user.name}님`}
                >
                  <User className="w-5 h-5" />
                  <ChevronDown className="w-3 h-3 absolute bottom-0 right-0" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 bg-card rounded-lg shadow-xl border border-border min-w-[160px] py-1 z-[100]">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{user.name}님</p>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentView("history");
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      등록 히스토리
                    </button>
                    <button
                      onClick={() => {
                        setChangePasswordModalOpen(true);
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      비밀번호 변경
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
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
                      회원탈퇴
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/35 transition-all shadow-lg border border-white/20"
                title="로그인"
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* 메인 콘텐츠 */}
        <div className="p-4 space-y-4">
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
                placeholder="식당, 음식, 야시장, 지역 검색..."
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
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{item.이름}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.위치}
                        {item.야시장 && ` · ${item.야시장}`}
                      </div>
                    </div>
                    {item.카테고리 && (
                      <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground flex-shrink-0">
                        {item.카테고리}
                      </span>
                    )}
                  </button>
                ))}
                {searchSuggestions.length > 0 && (
                  <button
                    onClick={() => handleSearch(searchQuery)}
                    className="w-full px-4 py-3 text-center text-primary font-medium hover:bg-muted/50 transition-colors"
                  >
                    "{searchQuery}" 전체 검색 결과 보기
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 대만 안내 페이지 버튼 */}
          <button
            onClick={() => {
              setViewHistory(prev => [...prev, currentView]);
              setCurrentView("guide");
              window.scrollTo(0, 0);
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 shadow-sm flex items-center justify-between hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">📖</span>
              </div>
              <div className="text-left">
                <h3 className="text-white font-bold text-base">타이베이 여행 가이드</h3>
                <p className="text-white/80 text-xs">12개 구 · 명소 · 신베이시 완벽 정리</p>
              </div>
            </div>
            <div className="text-white/80">
              <ChevronDown className="w-6 h-6 -rotate-90" />
            </div>
          </button>

          {/* 화장실 찾기 버튼 */}
          <button
            onClick={() => {
              setViewHistory(prev => [...prev, currentView]);
              setCurrentView("toilet");
              window.scrollTo(0, 0);
            }}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 shadow-sm flex items-center justify-between hover:from-green-600 hover:to-emerald-700 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚽</span>
              </div>
              <div className="text-left">
                <h3 className="text-white font-bold text-base">가까운 화장실 찾기</h3>
                <p className="text-white/80 text-xs">7-ELEVEN 화장실 위치 안내</p>
              </div>
            </div>
            <div className="text-white/80">
              <MapPin className="w-6 h-6" />
            </div>
          </button>

          {/* 퀵 카테고리 */}
          <section className="bg-card rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-semibold mb-3 text-foreground">카테고리</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant="secondary"
                    className="flex-col h-auto py-3 px-4 min-w-[70px] bg-muted hover:bg-muted/80 transition-all hover:scale-[1.05] active:scale-[0.98]"
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <span className="text-xl mb-1">{category.icon}</span>
                    <span className="text-xs">{category.name}</span>
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>

          {/* 인기 맛집 */}
          <section className="bg-card rounded-xl p-4 shadow-sm">
            <h2 className="text-base font-semibold mb-3 text-foreground">🔥 인기 맛집</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {popularRestaurants.map((restaurant, index) => (
                  <RestaurantCard
                    key={`${restaurant.이름}-${index}`}
                    restaurant={restaurant}
                    variant="horizontal"
                    category={restaurant.카테고리}
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
                <h2 className="text-base font-semibold text-foreground">📍 지역별 맛집 랭킹</h2>
                <button
                  onClick={() => {
                    setCurrentView("district-ranking");
                    setActiveTab("home");
                    window.scrollTo(0, 0);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  더보기
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
                          {item.count}개 맛집
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
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
            <h2 className="text-base font-semibold mb-3 text-foreground">🌙 야시장별 맛집</h2>
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
                    {market.name}
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
                    onClick={() => handleRestaurantSelect(restaurant)}
                  />
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  등록된 맛집이 없습니다.
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
        title="카테고리 선택"
        options={categories}
        onSelect={handleCategorySelect}
      />
      <CategorySheet
        open={marketSheetOpen}
        onOpenChange={setMarketSheetOpen}
        title="야시장 선택"
        options={markets}
        onSelect={handleMarketSelect}
      />
      <CategorySheet
        open={tourSheetOpen}
        onOpenChange={setTourSheetOpen}
        title="도심투어 지역"
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
