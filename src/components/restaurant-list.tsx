"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { Restaurant } from "@/data/taiwan-food";
import { RestaurantCard } from "./restaurant-card";

interface RestaurantListProps {
  title: string;
  restaurants: Restaurant[];
  onBack: () => void;
  onSelect: (restaurant: Restaurant) => void;
}

/**
 * 위치 필드에서 지역명 추출
 * 예: "타이베이 시먼딩" → "시먼딩"
 *     "타이베이 중산구 린동팡" → "중산구"
 *     "단수이" → "단수이"
 */
function extractRegion(location: string): string {
  if (!location) return "기타";

  // 도시명 목록 (제거 대상)
  const cities = ["타이베이", "신베이시", "타이중", "가오슝", "타이난"];

  let region = location.trim();

  // 도시명 제거
  for (const city of cities) {
    if (region.startsWith(city)) {
      region = region.slice(city.length).trim();
      break;
    }
  }

  // 영어 주소 처리 (예: "Jihe Rd, Shilin District")
  const districtMatch = region.match(/(\w+)\s*District/i);
  if (districtMatch) {
    const districtMap: Record<string, string> = {
      "Shilin": "스린",
      "Datong": "다퉁",
      "Zhongshan": "중산",
      "Xinyi": "신이",
    };
    return districtMap[districtMatch[1]] || districtMatch[1];
  }

  // "역"으로 끝나면 그대로 사용
  if (region.endsWith("역")) {
    return region;
  }

  // 첫 번째 지역 단어 추출 (공백, 쉼표로 분리)
  const parts = region.split(/[\s,]/);
  if (parts.length > 0 && parts[0]) {
    // 야시장 이름이면 야시장까지 포함
    if (parts.length >= 2 && parts[1] === "야시장") {
      return `${parts[0]} 야시장`;
    }
    return parts[0];
  }

  return region || "기타";
}

/**
 * 지역명을 구(區) 단위로 정규화
 * 타이베이 행정구역 기준으로 매핑
 */
function normalizeRegion(region: string): string {
  const districtMap: Record<string, string> = {
    // 완화구 (萬華區) - 시먼딩 일대
    "시먼딩": "완화구",
    "시먼": "완화구",
    "완화": "완화구",
    "완화구": "완화구",

    // 다안구 (大安區) - 융캉제, 동문시장 일대
    "융캉제": "다안구",
    "융캉": "다안구",
    "다안": "다안구",
    "다안구": "다안구",
    "동문": "다안구",

    // 중산구 (中山區)
    "중산": "중산구",
    "중산구": "중산구",
    "린동팡": "중산구",
    "민성": "중산구",

    // 중정구 (中正區) - 타이베이역, 중정기념당
    "중정구": "중정구",
    "중정": "중정구",
    "타이베이역": "중정구",

    // 신이구 (信義區) - 타이베이101
    "신이": "신이구",
    "신이구": "신이구",
    "101": "신이구",

    // 다퉁구 (大同區) - 닝샤 야시장, 디화제
    "닝샤": "다퉁구",
    "다퉁": "다퉁구",
    "다퉁구": "다퉁구",
    "디화제": "다퉁구",

    // 스린구 (士林區) - 스린 야시장
    "스린": "스린구",
    "스린구": "스린구",
    "스린야시장": "스린구",

    // 베이터우구 (北投區) - 온천
    "베이터우": "베이터우구",
    "베이터우구": "베이터우구",

    // 신베이시 (新北市)
    "단수이": "단수이",
    "싼충구": "싼충구",

    // 타이중 (台中)
    "펑자": "타이중",
  };

  return districtMap[region] || region;
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

    // 그룹을 맛집 수가 많은 순으로 정렬
    const sortedRegions = Object.keys(groups).sort((a, b) => {
      // "기타"는 항상 마지막
      if (a === "기타") return 1;
      if (b === "기타") return -1;
      return groups[b].length - groups[a].length;
    });

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

      {/* 지역별 그룹화된 결과 목록 */}
      <div className="p-4 space-y-6">
        {groupedByRegion.sortedRegions.length > 0 ? (
          groupedByRegion.sortedRegions.map((region) => (
            <section key={region}>
              {/* 지역 헤더 */}
              <div className="flex items-center gap-2 mb-3 sticky top-[60px] bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 z-[5]">
                <MapPin className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-foreground">{region}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {groupedByRegion.groups[region].length}개
                </span>
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
