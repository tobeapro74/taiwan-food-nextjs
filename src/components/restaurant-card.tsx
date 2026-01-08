"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { Restaurant } from "@/data/taiwan-food";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick?: () => void;
  variant?: "horizontal" | "vertical";
}

// 이름 기반 그라데이션 색상 생성
function getGradient(name: string): string {
  const hash = name.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const gradients = [
    "from-rose-500 to-pink-600",
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-fuchsia-500 to-pink-600",
    "from-indigo-500 to-blue-600",
    "from-lime-500 to-green-600",
  ];

  return gradients[Math.abs(hash) % gradients.length];
}

export function RestaurantCard({ restaurant, onClick, variant = "vertical" }: RestaurantCardProps) {
  const gradient = getGradient(restaurant.이름);

  if (variant === "horizontal") {
    return (
      <Card
        className="flex-shrink-0 w-44 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden border-0"
        onClick={onClick}
      >
        <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <span className="text-2xl font-bold text-white/90 px-2 text-center">
            {restaurant.이름.substring(0, 4)}
          </span>
        </div>
        <CardContent className="p-3">
          <h3 className="font-semibold text-sm truncate">{restaurant.이름}</h3>
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
      className="cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden border-0"
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
            <h3 className="font-semibold truncate">{restaurant.이름}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{restaurant.위치}</span>
            </p>
            {restaurant.특징 && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {restaurant.특징}
              </p>
            )}
            {restaurant.야시장 && (
              <Badge variant="secondary" className="mt-2 text-xs bg-accent/20 text-accent-foreground">
                {restaurant.야시장}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
