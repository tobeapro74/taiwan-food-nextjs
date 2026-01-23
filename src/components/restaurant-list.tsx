"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { Restaurant } from "@/data/taiwan-food";
import { RestaurantCard } from "./restaurant-card";
import { extractRegion, normalizeRegion, DISTRICT_INFO } from "@/lib/district-utils";

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

  // 실시간 평점 적용
  const restaurantsWithRatings = useMemo(() => {
    return restaurants.map(r => ({
      ...r,
      평점: liveRatings[r.이름]?.rating ?? r.평점,
      리뷰수: liveRatings[r.이름]?.userRatingsTotal ?? r.리뷰수
    }));
  }, [restaurants, liveRatings]);

  // 지역별 그룹화 및 정렬
  const groupedByRegion = useMemo(() => {
    const groups: Record<string, Restaurant[]> = {};

    restaurantsWithRatings.forEach(restaurant => {
      const rawRegion = extractRegion(restaurant.위치);
      const region = normalizeRegion(rawRegion);

      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region].push(restaurant);
    });

    // 각 그룹 내에서 평점순 정렬
    Object.keys(groups).forEach(region => {
      groups[region].sort((a, b) => (b.평점 || 0) - (a.평점 || 0));
    });

    // 그룹을 맛집 수가 많은 순으로 정렬 ("기타"는 제외)
    const sortedRegions = Object.keys(groups)
      .filter(region => region !== "기타")  // "기타" 카테고리 제외
      .sort((a, b) => groups[b].length - groups[a].length);

    return { groups, sortedRegions };
  }, [restaurantsWithRatings]);

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

      {/* 안내 문구 */}
      {groupedByRegion.sortedRegions.length > 0 && (
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <p className="text-sm text-muted-foreground">
            타이베이는 총 12개의 구로 구성되어 있으며, 맛집을 구별로 구분해 알려드려요.
          </p>
        </div>
      )}

      {/* 지역별 그룹화된 결과 목록 */}
      <div className="p-4 space-y-6">
        {groupedByRegion.sortedRegions.length > 0 ? (
          groupedByRegion.sortedRegions.map((region) => {
            const districtInfo = DISTRICT_INFO[region];
            return (
              <section key={region}>
                {/* 지역 헤더 */}
                <div className="mb-3 sticky top-[60px] bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 z-[5]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-foreground">
                      {districtInfo?.name || region}
                    </h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {groupedByRegion.groups[region].length}개
                    </span>
                  </div>
                  {districtInfo?.description && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6 leading-relaxed">
                      {districtInfo.description}
                    </p>
                  )}
                </div>
                {/* 해당 지역 맛집 목록 */}
                <div className="space-y-3">
                  {groupedByRegion.groups[region].map((restaurant, index) => (
                    <RestaurantCard
                      key={`${restaurant.이름}-${index}`}
                      restaurant={restaurant}
                      onClick={() => onSelect(restaurant)}
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="text-center text-muted-foreground py-12">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
