"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Info, Map, Phone, Banknote, Building2 } from "lucide-react";
import { Restaurant, getGoogleMapsLink, getUnsplashImage } from "@/data/taiwan-food";
import { ReviewSection } from "@/components/review-section";
import { GoogleReviews } from "@/components/google-reviews";
import Image from "next/image";

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
}

// 이미지 URL 캐시
const imageCache: Record<string, string> = {};

// 가격대/전화번호/건물명 캐시
const getRestaurantInfoCache = (): Record<string, { priceRange: string | null; phoneNumber: string | null; buildingName: string | null }> => {
  if (typeof window !== "undefined") {
    if (!(window as unknown as { __restaurantInfoCache?: Record<string, { priceRange: string | null; phoneNumber: string | null; buildingName: string | null }> }).__restaurantInfoCache) {
      (window as unknown as { __restaurantInfoCache: Record<string, { priceRange: string | null; phoneNumber: string | null; buildingName: string | null }> }).__restaurantInfoCache = {};
    }
    return (window as unknown as { __restaurantInfoCache: Record<string, { priceRange: string | null; phoneNumber: string | null; buildingName: string | null }> }).__restaurantInfoCache;
  }
  return {};
};

export function RestaurantDetail({ restaurant, onBack }: RestaurantDetailProps) {
  const fallbackUrl = getUnsplashImage(restaurant.이름);
  const [imageUrl, setImageUrl] = useState<string>(fallbackUrl);
  const [isLoading, setIsLoading] = useState(true);

  const cacheKey = restaurant.이름;
  const infoCache = getRestaurantInfoCache();
  const [priceRange, setPriceRange] = useState<string | null>(restaurant.가격대 || infoCache[cacheKey]?.priceRange || null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(restaurant.전화번호 || infoCache[cacheKey]?.phoneNumber || null);
  const [buildingName, setBuildingName] = useState<string | null>(restaurant.빌딩 || infoCache[cacheKey]?.buildingName || null);
  const [infoLoaded, setInfoLoaded] = useState(cacheKey in infoCache || !!restaurant.가격대 || !!restaurant.전화번호 || !!restaurant.빌딩);

  useEffect(() => {
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
  }, [restaurant.이름, restaurant.위치, fallbackUrl, cacheKey]);

  // 가격대/전화번호/건물명 정보 가져오기
  useEffect(() => {
    // 정적 데이터에 있으면 사용
    if (restaurant.가격대 || restaurant.전화번호 || restaurant.빌딩) {
      setPriceRange(restaurant.가격대 || null);
      setPhoneNumber(restaurant.전화번호 || null);
      setBuildingName(restaurant.빌딩 || null);
      setInfoLoaded(true);
      return;
    }

    // 이미 캐시된 경우
    if (cacheKey in infoCache) {
      setPriceRange(infoCache[cacheKey].priceRange);
      setPhoneNumber(infoCache[cacheKey].phoneNumber);
      setBuildingName(infoCache[cacheKey].buildingName);
      setInfoLoaded(true);
      return;
    }

    const fetchRestaurantInfo = async () => {
      try {
        const res = await fetch(`/api/restaurant-prices/${encodeURIComponent(restaurant.이름)}`);
        const data = await res.json();
        const fetchedPrice = data.priceRange || null;
        const fetchedPhone = data.phoneNumber || null;
        const fetchedBuilding = data.buildingName || null;
        infoCache[cacheKey] = { priceRange: fetchedPrice, phoneNumber: fetchedPhone, buildingName: fetchedBuilding };
        setPriceRange(fetchedPrice);
        setPhoneNumber(fetchedPhone);
        setBuildingName(fetchedBuilding);
      } catch (error) {
        console.error("Error fetching restaurant info:", error);
        infoCache[cacheKey] = { priceRange: null, phoneNumber: null, buildingName: null };
      } finally {
        setInfoLoaded(true);
      }
    };

    fetchRestaurantInfo();
  }, [restaurant.이름, restaurant.가격대, restaurant.전화번호, restaurant.빌딩, cacheKey, infoCache]);

  const googleMapsUrl = getGoogleMapsLink(restaurant.이름, restaurant.위치);

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
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold">{restaurant.이름}</h2>
            </div>

            {/* 배지 영역 */}
            <div className="flex flex-wrap gap-2">
              {restaurant.야시장 && (
                <Badge className="bg-accent text-accent-foreground">
                  {restaurant.야시장}
                </Badge>
              )}
              {(restaurant.빌딩 || buildingName) && (
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                  <Building2 className="h-3 w-3 mr-1" />
                  {restaurant.빌딩 || buildingName}
                </Badge>
              )}
            </div>

            {/* 상세 정보 목록 */}
            <div className="space-y-3 bg-muted/30 rounded-xl p-4">
              {restaurant.위치 && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{restaurant.위치}</span>
                </div>
              )}

              {restaurant.특징 && (
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{restaurant.특징}</span>
                </div>
              )}

              {/* 전화번호 - DB에서 가져온 전화번호 표시 */}
              {phoneNumber && (
                <a
                  href={`tel:${phoneNumber}`}
                  className="flex items-center gap-3 hover:text-primary transition-colors"
                >
                  <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{phoneNumber}</span>
                </a>
              )}

              {/* 가격대 - DB에서 가져온 가격대 표시 */}
              {priceRange && (
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{priceRange}</span>
                </div>
              )}

              {/* 로딩 표시 */}
              {!infoLoaded && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 animate-pulse bg-muted rounded" />
                  <span className="text-sm animate-pulse">정보 불러오는 중...</span>
                </div>
              )}
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 text-base mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              <Map className="h-5 w-5" />
              구글 지도에서 보기
            </a>
          </CardContent>
        </Card>

        {/* Google 리뷰 섹션 */}
        <GoogleReviews restaurantName={restaurant.이름} />

        {/* 사용자 리뷰 섹션 */}
        <ReviewSection
          restaurantId={restaurant.이름}
          restaurantName={restaurant.이름}
        />
      </div>
    </div>
  );
}
