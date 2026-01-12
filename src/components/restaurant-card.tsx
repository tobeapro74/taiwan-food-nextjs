"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Building2 } from "lucide-react";
import { Restaurant, getUnsplashImage } from "@/data/taiwan-food";
import Image from "next/image";

// 리뷰수 포맷 (1000 -> 1K, 10000 -> 10K)
function formatReviewCount(count: number): string {
  if (count >= 10000) return `${(count / 1000).toFixed(0)}K`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// 이미지 URL 캐시 (세션 동안 유지)
const imageCache: Record<string, string> = {};

// 카테고리 아이콘 매핑
const categoryIcons: Record<string, string> = {
  "면류": "🍜",
  "만두": "🥟",
  "밥류": "🍚",
  "디저트": "🍧",
  "길거리음식": "🍢",
  "카페": "☕",
};

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick?: () => void;
  variant?: "horizontal" | "vertical";
  category?: string;
}

export function RestaurantCard({ restaurant, onClick, variant = "vertical", category }: RestaurantCardProps) {
  const fallbackUrl = getUnsplashImage(restaurant.이름);
  const [imageUrl, setImageUrl] = useState<string>(fallbackUrl);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cacheKey = restaurant.이름;

    // 캐시에 있으면 바로 사용
    if (imageCache[cacheKey]) {
      setImageUrl(imageCache[cacheKey]);
      setIsLoading(false);
      return;
    }

    // Google Places API로 이미지 가져오기
    const fetchImage = async () => {
      try {
        const query = `${restaurant.이름} ${restaurant.위치 || ""}`.trim();
        const res = await fetch(`/api/place-photo?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.photoUrl) {
          imageCache[cacheKey] = data.photoUrl;
          setImageUrl(data.photoUrl);
        } else {
          imageCache[cacheKey] = fallbackUrl;
        }
      } catch {
        imageCache[cacheKey] = fallbackUrl;
      } finally {
        setIsLoading(false);
      }
    };

    fetchImage();
  }, [restaurant.이름, restaurant.위치, fallbackUrl]);

  if (variant === "horizontal") {
    return (
      <Card
        className="flex-shrink-0 w-44 cursor-pointer transition-all hover:scale-[1.05] hover:shadow-lg active:scale-[0.98] overflow-hidden shadow-sm"
        onClick={onClick}
      >
        <div className="h-28 relative overflow-hidden bg-muted">
          {isLoading && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
          )}
          <Image
            src={imageUrl}
            alt={restaurant.이름}
            fill
            className={`object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
            sizes="176px"
            unoptimized
          />
          {category && (
            <Badge className="absolute top-2 left-2 text-xs bg-black/60 text-white border-0">
              {categoryIcons[category]} {category}
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm truncate">{restaurant.이름}</h3>
          {restaurant.평점 && (
            <p className="text-xs flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-medium">{restaurant.평점}</span>
              {restaurant.리뷰수 && (
                <span className="text-muted-foreground">({formatReviewCount(restaurant.리뷰수)})</span>
              )}
            </p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{restaurant.위치?.substring(0, 12)}</span>
          </p>
          {restaurant.빌딩 && (
            <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{restaurant.빌딩}</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] overflow-hidden shadow-sm"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-24 h-24 relative overflow-hidden flex-shrink-0 bg-muted">
            {isLoading && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
            )}
            <Image
              src={imageUrl}
              alt={restaurant.이름}
              fill
              className={`object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
              sizes="96px"
              unoptimized
            />
          </div>
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{restaurant.이름}</h3>
              {restaurant.평점 && (
                <span className="text-xs flex items-center gap-0.5 flex-shrink-0">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{restaurant.평점}</span>
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{restaurant.위치}</span>
            </p>
            {restaurant.특징 && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {restaurant.특징}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {restaurant.야시장 && (
                <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground">
                  {restaurant.야시장}
                </Badge>
              )}
              {restaurant.빌딩 && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                  <Building2 className="h-3 w-3 mr-1" />
                  {restaurant.빌딩}
                </Badge>
              )}
              {restaurant.리뷰수 && (
                <span className="text-xs text-muted-foreground">
                  리뷰 {formatReviewCount(restaurant.리뷰수)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
