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
          </div>

          <div className="p-4 space-y-6">
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
                    </div>
                    <p className="text-xs">대만의 정치·경제·문화 중심지로, 12개의 행정구가 있으며 관광 명소와 맛집이 집중되어 있습니다.</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🌿</span>
                      <span className="font-semibold text-foreground">신베이시</span>
                    </div>
                    <p className="text-xs">타이베이를 둘러싸고 있는 광역 도시로, 자연·전통·근교 여행지들이 많아 당일치기 코스로 인기가 높습니다.</p>
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

            {/* 하단 안내 */}
            <div className="text-center py-4">
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
