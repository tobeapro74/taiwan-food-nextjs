"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Restaurant } from "@/data/taiwan-food";
import { RestaurantCard } from "./restaurant-card";

interface RestaurantListProps {
  title: string;
  restaurants: Restaurant[];
  onBack: () => void;
  onSelect: (restaurant: Restaurant) => void;
}

export function RestaurantList({ title, restaurants, onBack, onSelect }: RestaurantListProps) {
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
        </div>
      </div>

      {/* 결과 목록 */}
      <div className="p-4 space-y-3">
        {restaurants.length > 0 ? (
          restaurants.map((restaurant, index) => (
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
