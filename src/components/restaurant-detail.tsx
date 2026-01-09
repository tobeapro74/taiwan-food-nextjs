"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Info, Map } from "lucide-react";
import { Restaurant, getGoogleMapsLink, getUnsplashImage } from "@/data/taiwan-food";
import { ReviewSection } from "@/components/review-section";
import Image from "next/image";

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
}

// 이미지 URL 캐시
const imageCache: Record<string, string> = {};

export function RestaurantDetail({ restaurant, onBack }: RestaurantDetailProps) {
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
      <div className="h-56 relative overflow-hidden bg-muted">
        {isLoading && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
        )}
        <Image
          src={imageUrl}
          alt={restaurant.이름}
          fill
          className={`object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
          sizes="100vw"
          unoptimized
        />
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

        {/* 리뷰 섹션 */}
        <ReviewSection
          restaurantId={restaurant.이름}
          restaurantName={restaurant.이름}
        />
      </div>
    </div>
  );
}
