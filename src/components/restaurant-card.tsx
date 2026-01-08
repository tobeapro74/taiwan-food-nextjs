"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";
import { Restaurant } from "@/data/taiwan-food";

// 리뷰수 포맷 (1000 -> 1K, 10000 -> 10K)
function formatReviewCount(count: number): string {
  if (count >= 10000) return `${(count / 1000).toFixed(0)}K`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick?: () => void;
  variant?: "horizontal" | "vertical";
}

// 이름 기반 그라데이션 색상 생성 (다채로운 색상, 붉은 계열 최소화)
function getGradient(name: string): string {
  const hash = name.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const gradients = [
    "from-sky-400 to-blue-500",
    "from-emerald-400 to-teal-500",
    "from-violet-400 to-purple-500",
    "from-cyan-400 to-sky-500",
    "from-teal-400 to-emerald-500",
    "from-indigo-400 to-violet-500",
    "from-blue-400 to-indigo-500",
    "from-green-400 to-emerald-500",
    "from-purple-400 to-indigo-500",
    "from-slate-400 to-slate-500",
  ];

  return gradients[Math.abs(hash) % gradients.length];
}

export function RestaurantCard({ restaurant, onClick, variant = "vertical" }: RestaurantCardProps) {
  const gradient = getGradient(restaurant.이름);

  if (variant === "horizontal") {
    return (
      <Card
        className="flex-shrink-0 w-44 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden shadow-sm"
        onClick={onClick}
      >
        <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-2xl font-bold text-white/90 px-2 text-center">
            {restaurant.이름.substring(0, 4)}
          </span>
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden shadow-sm"
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className={`w-24 h-24 bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
            <span className="text-lg font-bold text-white/90 px-1 text-center">
              {restaurant.이름.substring(0, 3)}
            </span>
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
            <div className="flex items-center gap-2 mt-2">
              {restaurant.야시장 && (
                <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground">
                  {restaurant.야시장}
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
