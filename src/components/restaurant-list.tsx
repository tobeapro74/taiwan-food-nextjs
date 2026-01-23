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

  let region = location.trim();

  // "OO역"으로 끝나는 경우 먼저 처리 (도시명 제거 전에)
  // 예: "타이베이역" → "타이베이역" (그대로 유지)
  if (region.endsWith("역") && region.length > 1) {
    return region;
  }

  // 도시명 목록 (제거 대상) - 타이베이시, 신베이시 위주
  const cities = ["타이베이", "신베이시"];

  // 도시명 제거
  for (const city of cities) {
    if (region.startsWith(city)) {
      region = region.slice(city.length).trim();
      break;
    }
  }

  // 영어 주소 처리 (예: "Jihe Rd, Shilin District", "Da'an District")
  const districtMatch = region.match(/([\w']+)\s*District/i);
  if (districtMatch) {
    const districtName = districtMatch[1].replace(/'/g, ""); // Da'an → Daan
    const districtMap: Record<string, string> = {
      "Shilin": "스린",
      "Datong": "다퉁",
      "Zhongshan": "중산",
      "Xinyi": "신이",
      "Daan": "다안",
      "Da": "다안",  // Da'an에서 Da만 매칭되는 경우
      "Wanhua": "완화",
      "Zhongzheng": "중정",
      "Beitou": "베이터우",
      "Songshan": "송산",
      "Neihu": "네이후",
      "Nangang": "난강",
      "Wenshan": "원산",
    };
    return districtMap[districtName] || districtMatch[1];
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
 * 타이베이 12개 구 + 기타 지역 설명
 */
const DISTRICT_INFO: Record<string, { name: string; description: string }> = {
  // 타이베이 12구
  "중정구": {
    name: "중정구 (Zhongzheng)",
    description: "중정기념당과 타이베이 메인스테이션이 위치하고 있으며 시먼딩, 중산 상권과 가까이에 있어 교통과 관광의 중심지입니다."
  },
  "다안구": {
    name: "다안구 (Da'an)",
    description: "융캉제가 자리해 있으며 카페와 맛집이 밀집된 지역으로, 젊은 여행자들에게 인기 있는 감성 거리입니다."
  },
  "신이구": {
    name: "신이구 (Xinyi)",
    description: "타이베이 101타워와 대형 쇼핑몰이 모여 있는 금융·상업 중심지로, 야경과 쇼핑을 동시에 즐길 수 있습니다."
  },
  "완화구": {
    name: "완화구 (Wanhua)",
    description: "시먼딩이 위치해 있으며 젊은 층과 관광객이 모이는 패션·문화 거리입니다. 용산사 같은 전통 명소도 함께 있습니다."
  },
  "중산구": {
    name: "중산구 (Zhongshan)",
    description: "중산 카페거리와 세련된 바, 호텔이 밀집해 있어 감성 여행과 나이트라이프를 즐기기에 적합합니다."
  },
  "스린구": {
    name: "스린구 (Shilin)",
    description: "타이베이 최대 규모의 스린 야시장과 국립고궁박물원이 위치해 있어 먹거리와 문화 체험을 동시에 즐길 수 있습니다."
  },
  "베이터우구": {
    name: "베이터우구 (Beitou)",
    description: "온천으로 유명한 지역으로, 온천 호텔과 베이터우 도서관이 있어 힐링 여행에 적합합니다."
  },
  "송산구": {
    name: "송산구 (Songshan)",
    description: "송산공항과 라오허제 야시장이 위치해 있으며, 교통이 편리하고 야시장 먹거리 탐방에 좋은 곳입니다."
  },
  "다퉁구": {
    name: "다퉁구 (Datong)",
    description: "디화제가 자리해 있으며 전통시장과 한약방, 건축물이 많아 대만의 옛 정취를 느낄 수 있습니다."
  },
  "네이후구": {
    name: "네이후구 (Neihu)",
    description: "IT 기업과 주거지역이 밀집해 있으며, 대형 쇼핑몰과 호수 공원이 있어 현지인 생활을 체험할 수 있습니다."
  },
  "난강구": {
    name: "난강구 (Nangang)",
    description: "난강 전시센터와 IT 산업 단지가 위치해 있으며, 대형 콘서트와 박람회가 자주 열리는 지역입니다."
  },
  "원산구": {
    name: "원산구 (Wenshan)",
    description: "마오콩 곤돌라와 동물원이 있어 자연과 함께하는 여행에 적합하며, 가족 단위 관광객에게 인기가 많습니다."
  },
  // 신베이시
  "단수이": {
    name: "단수이 (Tamsui)",
    description: "신베이시에 위치한 해안 도시로, 석양이 아름다운 단수이 올드스트리트와 홍마오청이 유명합니다."
  },
  "싼충구": {
    name: "싼충구 (Sanchong)",
    description: "신베이시에 위치하며 타이베이와 인접해 있어 접근성이 좋고 현지인 맛집이 많습니다."
  },
};

/**
 * 지역명을 구(區) 단위로 정규화
 * 타이베이 행정구역 기준으로 매핑 (한글 + 영어)
 */
function normalizeRegion(region: string): string {
  // 소문자로 변환하여 대소문자 구분 없이 매칭
  const lowerRegion = region.toLowerCase();

  const districtMap: Record<string, string> = {
    // 완화구 (萬華區) - 시먼딩 일대
    "시먼딩": "완화구",
    "시먼": "완화구",
    "완화": "완화구",
    "완화구": "완화구",
    "룽산": "완화구",
    "wanhua": "완화구",
    "ximending": "완화구",

    // 다안구 (大安區) - 융캉제, 동문시장 일대
    "융캉제": "다안구",
    "융캉": "다안구",
    "다안": "다안구",
    "다안구": "다안구",
    "동문": "다안구",
    "da'an": "다안구",
    "daan": "다안구",
    "an": "다안구",  // Da'an에서 an만 추출되는 경우

    // 중산구 (中山區)
    "중산": "중산구",
    "중산구": "중산구",
    "린동팡": "중산구",
    "민성": "중산구",
    "zhongshan": "중산구",

    // 중정구 (中正區) - 타이베이역, 중정기념당, 난지창 야시장
    "중정구": "중정구",
    "중정": "중정구",
    "타이베이역": "중정구",
    "역": "중정구",  // "타이베이역 지하상가" → "역" 추출 시
    "중정기념당": "중정구",
    "난지창": "중정구",
    "난지창 야시장": "중정구",
    "zhongzheng": "중정구",

    // 신이구 (信義區) - 타이베이101
    "신이": "신이구",
    "신이구": "신이구",
    "101": "신이구",
    "xinyi": "신이구",

    // 다퉁구 (大同區) - 닝샤 야시장, 디화제, 츠펑가
    "닝샤": "다퉁구",
    "닝샤 야시장": "다퉁구",
    "다퉁": "다퉁구",
    "다퉁구": "다퉁구",
    "디화제": "다퉁구",
    "츠펑가": "다퉁구",
    "datong": "다퉁구",

    // 스린구 (士林區) - 스린 야시장
    "스린": "스린구",
    "스린구": "스린구",
    "스린야시장": "스린구",
    "shilin": "스린구",

    // 베이터우구 (北投區) - 온천
    "베이터우": "베이터우구",
    "베이터우구": "베이터우구",
    "beitou": "베이터우구",

    // 송산구 (松山區) - 라오허제 야시장
    "송산": "송산구",
    "송산구": "송산구",
    "라오허제": "송산구",
    "라오허제 야시장": "송산구",
    "songshan": "송산구",

    // 네이후구 (內湖區)
    "네이후": "네이후구",
    "네이후구": "네이후구",
    "neihu": "네이후구",

    // 난강구 (南港區)
    "난강": "난강구",
    "난강구": "난강구",
    "nangang": "난강구",

    // 원산구 (文山區)
    "원산": "원산구",
    "원산구": "원산구",
    "마오콩": "원산구",
    "wenshan": "원산구",

    // 신베이시 (新北市)
    "단수이": "단수이",
    "tamsui": "단수이",
    "danshui": "단수이",
    "싼충구": "싼충구",
    "싼충": "싼충구",
    "sanchong": "싼충구",
    "sanchon": "싼충구",
  };

  // Plus Code 패턴 매핑 (Google Plus Code → 해당 지역)
  const plusCodeMap: Record<string, string> = {
    "3f4m+5g6": "싼충구",  // 싼충역 근처
  };

  // Plus Code 패턴 감지 (예: 3F4M+5G6)
  if (/^[A-Z0-9]{4,}\+[A-Z0-9]+$/i.test(region)) {
    return plusCodeMap[lowerRegion] || "기타";
  }

  return districtMap[lowerRegion] || districtMap[region] || region;
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
