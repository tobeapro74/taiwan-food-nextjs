"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { User, LogOut, Search, X, MapPin, ChevronDown, Key } from "lucide-react";
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
} from "@/data/taiwan-food";

type View = "home" | "list" | "detail" | "nearby";
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
  const [previousView, setPreviousView] = useState<View>("home"); // 이전 화면 추적
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 맛집 등록 모달 상태
  const [addRestaurantModalOpen, setAddRestaurantModalOpen] = useState(false);

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

  // 인기 맛집 (카테고리별 최고 평점 맛집)
  const popularRestaurants = useMemo(() => {
    return getPopularRestaurants();
  }, []);

  // 야시장별 맛집
  const marketRestaurants = useMemo(() => {
    return getRestaurantsByMarket(selectedMarket).slice(0, 6);
  }, [selectedMarket]);

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
    setPreviousView("home");
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
      // 맛집 등록 - 로그인 필요
      if (!user) {
        setAuthModalOpen(true);
      } else {
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

  // 카테고리 선택
  const handleCategorySelect = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    setListTitle(categoryId === "전체" ? "전체 맛집" : `${category?.name || categoryId} 맛집`);
    setListItems(getRestaurantsByCategory(categoryId));
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
    setPreviousView(currentView); // 현재 화면 저장
    setSelectedRestaurant(restaurant);
    setCurrentView("detail");
  };

  // 뒤로가기
  const handleBack = useCallback(() => {
    if (currentView === "detail") {
      // 이전 화면이 홈이면 홈으로, nearby면 nearby로, 리스트면 리스트로
      if (previousView === "home") {
        setCurrentView("home");
        setActiveTab("home");
      } else if (previousView === "nearby") {
        setCurrentView("nearby");
        setActiveTab("nearby");
      } else {
        setCurrentView("list");
      }
      setSelectedRestaurant(null);
    } else if (currentView === "list" || currentView === "nearby") {
      setCurrentView("home");
      setActiveTab("home");
    }
  }, [currentView, previousView]);

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
        <RestaurantDetail restaurant={selectedRestaurant} onBack={handleBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
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
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
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

  if (currentView === "list") {
    return (
      <>
        <RestaurantList
          title={listTitle}
          restaurants={listItems}
          onBack={handleBack}
          onSelect={handleRestaurantSelect}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
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
        <header className="bg-gradient-to-r from-primary to-primary/80 safe-area-top">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="w-10" /> {/* 왼쪽 여백 */}
            <h1 className="text-xl font-bold text-primary-foreground text-center">
              🍜 대만맛집정보
            </h1>
            {/* 로그인/사용자 버튼 */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-primary-foreground hover:bg-white/30 transition-colors"
                  title={`${user.name}님`}
                >
                  <User className="w-5 h-5" />
                  <ChevronDown className="w-3 h-3 absolute bottom-0 right-0" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-12 bg-card rounded-lg shadow-lg border border-border min-w-[160px] py-1 z-50">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground">{user.name}님</p>
                    </div>
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
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-primary-foreground hover:bg-white/30 transition-colors"
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

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

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
