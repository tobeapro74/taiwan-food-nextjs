"use client";

import { useState, useMemo, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BottomNav } from "@/components/bottom-nav";
import { RestaurantCard } from "@/components/restaurant-card";
import { RestaurantList } from "@/components/restaurant-list";
import { RestaurantDetail } from "@/components/restaurant-detail";
import { CategorySheet } from "@/components/category-sheet";
import { AuthModal } from "@/components/auth-modal";
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
} from "@/data/taiwan-food";

type View = "home" | "list" | "detail";
type TabType = "home" | "category" | "market" | "tour" | "places";

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

  // 사용자 인증 상태
  const [user, setUser] = useState<UserInfo | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

  // 탭 변경 처리
  const handleTabChange = (tab: TabType) => {
    if (tab === "home") {
      setCurrentView("home");
      setActiveTab("home");
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
  const handleBack = () => {
    if (currentView === "detail") {
      // 이전 화면이 홈이면 홈으로, 리스트면 리스트로
      if (previousView === "home") {
        setCurrentView("home");
        setActiveTab("home");
      } else {
        setCurrentView("list");
      }
      setSelectedRestaurant(null);
    } else {
      setCurrentView("home");
      setActiveTab("home");
    }
  };

  // 렌더링
  if (currentView === "detail" && selectedRestaurant) {
    return (
      <>
        <RestaurantDetail restaurant={selectedRestaurant} onBack={handleBack} />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
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
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-primary-foreground hover:bg-white/30 transition-colors"
                title={`${user.name}님 (로그아웃)`}
              >
                <LogOut className="w-5 h-5" />
              </button>
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
    </>
  );
}
