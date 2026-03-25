"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Building2 } from "lucide-react";
import { Restaurant, getUnsplashImage, getDisplayName, getDisplayLocation, getDisplayFeature, getDisplayBuilding, getDisplayNightMarket } from "@/data/taiwan-food";
import { useLanguage } from "@/components/language-provider";
import { useHaptic } from "@/hooks/useHaptic";
import { useLongPress } from "@/hooks/useLongPress";
import { PeekPreview } from "@/components/peek-preview";
import Image from "next/image";

// 리뷰수 포맷 (1000 -> 1K, 10000 -> 10K)
function formatReviewCount(count: number): string {
  if (count >= 10000) return `${(count / 1000).toFixed(0)}K`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// 이미지 URL 캐시 (세션 동안 유지)
const imageCache: Record<string, string> = {};

// 구글 평점 캐시 (세션 동안 유지)
const ratingCache: Record<string, { rating: number | null; reviewsCount: number | null }> = {};

// 카테고리 아이콘 매핑
const categoryIcons: Record<string, string> = {
  "면류": "🍜",
  "만두": "🥟",
  "밥류": "🍚",
  "디저트": "🍧",
  "길거리음식": "🍢",
  "카페": "☕",
};

// 카테고리 ID -> i18n 키 매핑
const categoryI18nKeys: Record<string, string> = {
  "전체": "categories.all",
  "면류": "categories.noodles",
  "밥류": "categories.rice",
  "탕류": "categories.soup",
  "만두": "categories.dumplings",
  "디저트": "categories.dessert",
  "길거리음식": "categories.street_food",
  "카페": "categories.cafe",
  "까르푸": "categories.carrefour",
};

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick?: () => void;
  onViewDetail?: () => void;
  variant?: "horizontal" | "vertical";
  category?: string;
  imageUrl?: string; // DB 캐시된 이미지 URL (일괄 조회)
}

export function RestaurantCard({ restaurant, onClick, onViewDetail, variant = "vertical", category, imageUrl: propImageUrl }: RestaurantCardProps) {
  const { t, language } = useLanguage();
  const { impact } = useHaptic();
  const [showPeek, setShowPeek] = useState(false);
  const fallbackUrl = getUnsplashImage(restaurant.이름);
  const cachedUrl = imageCache[restaurant.이름] || propImageUrl;
  const [imageUrl, setImageUrl] = useState<string>(cachedUrl || "");
  const [imageLoaded, setImageLoaded] = useState(false);

  // 구글 평점 상태 (캐시에서 초기값 가져오기)
  const cacheKey = restaurant.이름;
  const [googleRating, setGoogleRating] = useState<number | null>(ratingCache[cacheKey]?.rating ?? null);
  const [googleReviewsCount, setGoogleReviewsCount] = useState<number | null>(ratingCache[cacheKey]?.reviewsCount ?? null);

  // propImageUrl이 나중에 들어오면 즉시 반영
  useEffect(() => {
    if (propImageUrl && propImageUrl !== imageUrl) {
      imageCache[cacheKey] = propImageUrl;
      setImageLoaded(false);
      setImageUrl(propImageUrl);
    }
  }, [propImageUrl, cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // 캐시에 있으면 바로 사용
    if (imageCache[cacheKey]) {
      setImageUrl(imageCache[cacheKey]);
      return;
    }

    // prop으로 DB 캐시 이미지를 받았으면 바로 사용 (개별 API 호출 불필요)
    if (propImageUrl) {
      imageCache[cacheKey] = propImageUrl;
      setImageUrl(propImageUrl);
      return;
    }

    // DB에 캐시가 없는 경우에만 개별 Google Places API로 이미지 가져오기
    const fetchImage = async () => {
      try {
        const query = `${restaurant.이름} ${restaurant.위치 || ""}`.trim();
        const res = await fetch(`/api/place-photo?query=${encodeURIComponent(query)}&name=${encodeURIComponent(restaurant.이름)}`);
        const data = await res.json();

        if (data.photoUrl) {
          imageCache[cacheKey] = data.photoUrl;
          setImageLoaded(false);
          setImageUrl(data.photoUrl);
        } else {
          imageCache[cacheKey] = fallbackUrl;
          setImageUrl(fallbackUrl);
        }
      } catch {
        imageCache[cacheKey] = fallbackUrl;
        setImageUrl(fallbackUrl);
      }
    };

    fetchImage();
  }, [cacheKey, restaurant.이름, restaurant.위치, fallbackUrl]); // propImageUrl 제거 (별도 useEffect에서 처리)

  // 구글 평점 가져오기
  useEffect(() => {
    // 이미 캐시에 있으면 사용
    if (ratingCache[cacheKey]) {
      setGoogleRating(ratingCache[cacheKey].rating);
      setGoogleReviewsCount(ratingCache[cacheKey].reviewsCount);
      return;
    }

    const fetchRating = async () => {
      try {
        const res = await fetch(`/api/google-reviews/${encodeURIComponent(restaurant.이름)}`);
        const data = await res.json();

        ratingCache[cacheKey] = {
          rating: data.rating || null,
          reviewsCount: data.userRatingsTotal || null
        };

        setGoogleRating(data.rating || null);
        setGoogleReviewsCount(data.userRatingsTotal || null);
      } catch {
        ratingCache[cacheKey] = { rating: null, reviewsCount: null };
      }
    };

    fetchRating();
  }, [cacheKey, restaurant.이름]);

  // 표시할 평점과 리뷰수 (구글 평점 우선, 없으면 정적 데이터)
  const displayRating = googleRating ?? restaurant.평점;
  const displayReviewsCount = googleReviewsCount ?? restaurant.리뷰수;

  // 롱프레스 핸들러
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      impact();
      setShowPeek(true);
    },
    onClick: () => {
      impact();
      onClick?.();
    },
  });

  if (variant === "horizontal") {
    return (
      <>
      <Card
        className="flex-shrink-0 w-44 cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-card-hover active:scale-[0.98] overflow-hidden"
        style={{ WebkitTouchCallout: "none" }}
        {...longPressHandlers}
      >
        <div className="h-32 relative overflow-hidden bg-muted">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
          )}
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={getDisplayName(restaurant, language)}
              fill
              className={`object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              sizes="176px"
              unoptimized
              onLoad={() => setImageLoaded(true)}
              onError={() => { setImageUrl(fallbackUrl); setImageLoaded(true); }}
            />
          )}
          {category && (
            <Badge className="absolute top-2 left-2 text-xs bg-black/60 text-white border-0">
              {categoryIcons[category]} {categoryI18nKeys[category] ? t(categoryI18nKeys[category]) : category}
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm truncate">{getDisplayName(restaurant, language)}</h3>
          {displayRating && (
            <p className="text-xs flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span className="font-medium">{displayRating}</span>
              {displayReviewsCount && (
                <span className="text-muted-foreground">({formatReviewCount(displayReviewsCount)})</span>
              )}
            </p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{getDisplayLocation(restaurant, language)?.substring(0, 12)}</span>
          </p>
          {restaurant.빌딩 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{getDisplayBuilding(restaurant, language)}</span>
            </p>
          )}
        </CardContent>
      </Card>
      {showPeek && (
        <PeekPreview
          restaurant={restaurant}
          onClose={() => setShowPeek(false)}
          onViewDetail={() => { setShowPeek(false); (onViewDetail || onClick)?.(); }}
        />
      )}
      </>
    );
  }

  return (
    <>
    <Card
      className="cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-card-hover active:scale-[0.98] overflow-hidden"
      style={{ WebkitTouchCallout: "none" }}
      {...longPressHandlers}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-28 h-28 relative overflow-hidden flex-shrink-0 bg-muted rounded-l-2xl">
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
            )}
            {imageUrl && (
              <Image
                src={imageUrl}
                alt={getDisplayName(restaurant, language)}
                fill
                className={`object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                sizes="96px"
                unoptimized
                onLoad={() => setImageLoaded(true)}
              onError={() => { setImageUrl(fallbackUrl); setImageLoaded(true); }}
              />
            )}
          </div>
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{getDisplayName(restaurant, language)}</h3>
              {displayRating && (
                <span className="text-xs flex items-center gap-0.5 flex-shrink-0">
                  <Star className="h-3 w-3 fill-accent text-accent" />
                  <span className="font-medium">{displayRating}</span>
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{getDisplayLocation(restaurant, language)}</span>
            </p>
            {(restaurant.특징 || restaurant.feature_en) && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {getDisplayFeature(restaurant, language)}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {restaurant.야시장 && (
                <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground">
                  {getDisplayNightMarket(restaurant.야시장, language)}
                </Badge>
              )}
              {restaurant.빌딩 && (
                <Badge variant="outline" className="text-xs text-muted-foreground border-border bg-muted/50">
                  <Building2 className="h-3 w-3 mr-1" />
                  {getDisplayBuilding(restaurant, language)}
                </Badge>
              )}
              {displayReviewsCount && (
                <span className="text-xs text-muted-foreground">
                  {t("restaurant.reviews")} {formatReviewCount(displayReviewsCount)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    {showPeek && (
      <PeekPreview
        restaurant={restaurant}
        onClose={() => setShowPeek(false)}
        onViewDetail={() => { setShowPeek(false); (onViewDetail || onClick)?.(); }}
      />
    )}
    </>
  );
}
