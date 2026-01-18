"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Restaurant } from "@/data/taiwan-food";
import { RestaurantCard } from "./restaurant-card";

interface RestaurantListProps {
  title: string;
  restaurants: Restaurant[];
  onBack: () => void;
  onSelect: (restaurant: Restaurant) => void;
}

export function RestaurantList({ title, restaurants, onBack, onSelect }: RestaurantListProps) {
  const [liveRatings, setLiveRatings] = useState<Record<string, { rating: number | null; userRatingsTotal: number | null }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // 실시간 평점 조회
  useEffect(() => {
    const fetchLiveRatings = async () => {
      if (restaurants.length === 0) {
        setIsLoading(false);
        return;
      }

      const names = restaurants.map(r => r.이름);

      try {
        const res = await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names })
        });
        const data = await res.json();
        if (data.ratings) {
          setLiveRatings(data.ratings);
        }
      } catch (error) {
        console.error("Failed to fetch live ratings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    fetchLiveRatings();
  }, [restaurants]);

  // 실시간 평점 적용 및 평점 높은 순 정렬
  const sortedRestaurants = useMemo(() => {
    return restaurants
      .map(r => ({
        ...r,
        평점: liveRatings[r.이름]?.rating ?? r.평점,
        리뷰수: liveRatings[r.이름]?.userRatingsTotal ?? r.리뷰수
      }))
      .sort((a, b) => (b.평점 || 0) - (a.평점 || 0));
  }, [restaurants, liveRatings]);

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm safe-area-top">
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="ghost"
            onClick={onBack}
            className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">{title}</h1>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
          )}
        </div>
      </div>

      {/* 결과 목록 */}
      <div className="p-4 space-y-3">
        {sortedRestaurants.length > 0 ? (
          sortedRestaurants.map((restaurant, index) => (
            <RestaurantCard
              key={`${restaurant.이름}-${index}`}
              restaurant={restaurant}
              onClick={() => onSelect(restaurant)}
            />
          ))
        ) : (
          <div className="text-center text-muted-foreground py-12">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
