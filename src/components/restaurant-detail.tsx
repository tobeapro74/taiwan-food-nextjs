"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Info, Map } from "lucide-react";
import { Restaurant, getGoogleMapsLink } from "@/data/taiwan-food";

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
}

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

export function RestaurantDetail({ restaurant, onBack }: RestaurantDetailProps) {
  const gradient = getGradient(restaurant.이름);

  const handleMapClick = () => {
    window.open(getGoogleMapsLink(restaurant.이름, restaurant.위치), "_blank");
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold truncate">{restaurant.이름}</h1>
        </div>
      </div>

      {/* 이미지 영역 */}
      <div className={`h-56 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="text-4xl font-bold text-white/90">
          {restaurant.이름.substring(0, 6)}
        </span>
      </div>

      {/* 정보 카드 */}
      <div className="p-4">
        <Card className="border-0">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-xl font-bold">{restaurant.이름}</h2>

            {restaurant.위치 && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{restaurant.위치}</span>
              </div>
            )}

            {restaurant.특징 && (
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{restaurant.특징}</span>
              </div>
            )}

            {restaurant.야시장 && (
              <Badge className="bg-accent text-accent-foreground">
                {restaurant.야시장}
              </Badge>
            )}

            <Button
              className="w-full h-12 text-base mt-4"
              onClick={handleMapClick}
            >
              <Map className="h-5 w-5 mr-2" />
              구글 지도에서 보기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
