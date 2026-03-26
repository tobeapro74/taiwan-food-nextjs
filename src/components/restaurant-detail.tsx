"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Info, Map, Navigation, Phone, Banknote, Building2, Tag, Settings, Trash2, Clock, Star } from "lucide-react";
import { Restaurant, getGoogleMapsLink, getUnsplashImage, categories, getDisplayName, getDisplayLocation, getDisplayFeature, getDisplayBuilding, getDisplayNightMarket } from "@/data/taiwan-food";
import { ReviewSection } from "@/components/review-section";
import { GoogleReviews } from "@/components/google-reviews";
import { CategoryEditModal } from "@/components/category-edit-modal";
import { RestaurantEditModal } from "@/components/restaurant-edit-modal";
// Image import 제거 - Capacitor WebView 호환성을 위해 img 태그 사용
import { useLanguage } from "@/components/language-provider";

// 사용자 등록 맛집용 확장 인터페이스
interface ExtendedRestaurant extends Restaurant {
  place_id?: string;
  category?: string;
  registered_by?: number;
  feature?: string;
  phone_number?: string;
  opening_hours?: string[];
  google_map_url?: string;
  address?: string;
  google_rating?: number;
  google_reviews_count?: number;
}

interface UserInfo {
  id: number;
  name: string;
  is_admin: boolean;
}

interface RestaurantDetailProps {
  restaurant: ExtendedRestaurant;
  onBack: () => void;
  user?: UserInfo | null;
  onCategoryChange?: (newCategory: string) => void;
  onDelete?: () => void;
  onUpdate?: (updatedData: Partial<ExtendedRestaurant>) => void;
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

export function RestaurantDetail({ restaurant, onBack, user, onCategoryChange, onDelete, onUpdate }: RestaurantDetailProps) {
  const { t, language } = useLanguage();
  const fallbackUrl = getUnsplashImage(restaurant.이름);
  const [imageUrl, setImageUrl] = useState<string>(fallbackUrl);
  const [isLoading, setIsLoading] = useState(true);

  const cacheKey = restaurant.이름;
  const infoCache = getRestaurantInfoCache();
  const [priceRange, setPriceRange] = useState<string | null>(restaurant.가격대 || infoCache[cacheKey]?.priceRange || null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(restaurant.전화번호 || infoCache[cacheKey]?.phoneNumber || null);
  const [buildingName, setBuildingName] = useState<string | null>(restaurant.빌딩 || infoCache[cacheKey]?.buildingName || null);
  const [infoLoaded, setInfoLoaded] = useState(cacheKey in infoCache || !!restaurant.가격대 || !!restaurant.전화번호 || !!restaurant.빌딩);

  // 카테고리 수정 모달 상태
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(restaurant.category || "");

  // 상세 정보 수정 모달 상태
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(restaurant.feature || restaurant.특징 || "");
  const [currentFeatureEn, setCurrentFeatureEn] = useState(restaurant.feature_en || "");
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(restaurant.phone_number || "");
  const [isDeleting, setIsDeleting] = useState(false);

  // 사용자 등록 맛집인지 확인 (place_id가 있고 static_ prefix가 아닌 경우)
  const isCustomRestaurant = !!restaurant.place_id && !restaurant.place_id.startsWith("static_");

  // 수정 권한 확인 (등록자 본인 또는 관리자 또는 박병철)
  // registered_by가 없는 기존 맛집도 관리자/박병철이면 수정 가능
  const canEdit = user && isCustomRestaurant && (
    user.is_admin ||
    user.name === "박병철" ||
    restaurant.registered_by === user.id
  );

  // 카테고리 아이콘 및 이름 가져오기
  const getCategoryInfo = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? { icon: cat.icon, name: t(cat.nameKey) } : { icon: "🍽️", name: categoryId };
  };

  // 맛집 삭제 핸들러
  const handleDelete = async () => {
    if (!restaurant.place_id) return;
    if (!confirm(t("restaurant.delete_confirm", { name: getDisplayName(restaurant, language) }))) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/custom-restaurants?placeId=${encodeURIComponent(restaurant.place_id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("restaurant.delete_success"));
        onDelete?.();
        onBack();
      } else {
        toast.error(data.error || t("restaurant.delete_failed"));
      }
    } catch {
      toast.error(t("restaurant.delete_failed"));
    } finally {
      setIsDeleting(false);
    }
  };

  // 컴포넌트 마운트 시 스크롤 상단으로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 사용자 등록 맛집일 경우 DB에서 최신 데이터 가져오기
  useEffect(() => {
    if (!restaurant.place_id) return;

    const fetchLatestData = async () => {
      try {
        const res = await fetch(`/api/custom-restaurants?place_id=${encodeURIComponent(restaurant.place_id!)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const latestData = data.data[0];
          // 최신 데이터로 상태 업데이트
          if (latestData.category) setCurrentCategory(latestData.category);
          if (latestData.feature !== undefined) setCurrentFeature(latestData.feature || "");
          if (latestData.feature_en !== undefined) setCurrentFeatureEn(latestData.feature_en || "");
          if (latestData.phone_number !== undefined) {
            setCurrentPhoneNumber(latestData.phone_number || "");
            setPhoneNumber(latestData.phone_number || null);
          }
          // 부모 컴포넌트에도 알림
          onUpdate?.({
            category: latestData.category,
            feature: latestData.feature,
            phone_number: latestData.phone_number,
            opening_hours: latestData.opening_hours,
            address: latestData.address,
          });
        }
      } catch (error) {
        console.error("최신 데이터 가져오기 실패:", error);
      }
    };

    fetchLatestData();
  }, [restaurant.place_id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const res = await fetch(`/api/place-photo?query=${encodeURIComponent(query)}&name=${encodeURIComponent(restaurant.이름)}`);
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

  // 구글 지도 URL 생성: 사용자 등록 맛집은 google_map_url 또는 address 사용
  const googleMapsUrl = isCustomRestaurant
    ? restaurant.google_map_url ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address || restaurant.이름)}`
    : getGoogleMapsLink(restaurant.이름, restaurant.위치, restaurant.coordinates);

  // 히어로 이미지 스크롤 감지 (미니 헤더 표시)
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyHeader(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen pb-20">
      {/* 스크롤 시 미니 스티키 헤더 */}
      {showStickyHeader && (
        <div className="fixed top-0 left-0 right-0 z-30 bg-background/95 border-b safe-area-top animate-fade-in" style={{ WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-2 p-3">
            <Button variant="ghost" onClick={onBack} className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-semibold truncate flex-1">{getDisplayName(restaurant, language)}</span>
            {canEdit && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditModalOpen(true)} className="h-9 w-9 text-muted-foreground hover:text-primary">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting} className="h-9 w-9 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 히어로 이미지 */}
      <div ref={heroRef} className="h-72 relative overflow-hidden bg-muted">
        {isLoading && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={getDisplayName(restaurant, language)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
          onError={() => {
            console.error("Image load error:", imageUrl);
            setImageUrl(fallbackUrl);
            setIsLoading(false);
          }}
          onLoad={() => setIsLoading(false)}
        />
        {/* 그래디언트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* 플로팅 뒤로가기 + 액션 버튼 */}
        <div className="absolute top-0 left-0 right-0 safe-area-top z-20">
          <div className="flex items-center justify-between p-3">
            <Button
              variant="ghost"
              onClick={onBack}
              className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-black/30 hover:bg-black/50 text-white"
              style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {canEdit && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditModalOpen(true)}
                  className="h-9 w-9 text-white bg-black/30 hover:bg-black/50 rounded-full"
                  style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting}
                  className="h-9 w-9 text-white bg-black/30 hover:bg-black/50 rounded-full"
                  style={{ WebkitBackdropFilter: 'blur(8px)', backdropFilter: 'blur(8px)' }}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 타이틀 + 뱃지 (이미지 하단 오버레이) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <h1 className="text-2xl font-bold text-white drop-shadow-md">{getDisplayName(restaurant, language)}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {isCustomRestaurant && currentCategory && (
              <Badge className="bg-white/20 text-white border-white/30" style={{ WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}>
                {getCategoryInfo(currentCategory).icon} {getCategoryInfo(currentCategory).name}
              </Badge>
            )}
            {restaurant.야시장 && (
              <Badge className="bg-white/20 text-white border-white/30" style={{ WebkitBackdropFilter: 'blur(4px)', backdropFilter: 'blur(4px)' }}>
                {getDisplayNightMarket(restaurant.야시장, language)}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 정보 카드 (히어로 겹침 효과) */}
      <div className="relative -mt-4 z-10 px-4 pt-0 pb-4">
        <Card className="border-0 shadow-premium rounded-2xl">
          <CardContent className="p-5 space-y-4">

            {/* 빌딩 배지 (카테고리/야시장은 히어로에 표시) */}
            {(restaurant.빌딩 || buildingName) && (
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline" className="text-muted-foreground border-border bg-muted/50">
                  <Building2 className="h-3 w-3 mr-1" />
                  {getDisplayBuilding(restaurant, language) || buildingName}
                </Badge>
              </div>
            )}

            {/* 상세 정보 목록 */}
            <div className="space-y-3 bg-muted/30 rounded-xl p-4">
              {/* 주소 - 사용자 등록 맛집은 address/location_en, 정적 데이터는 위치 */}
              {(restaurant.address || restaurant.위치) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm">
                    {isCustomRestaurant
                      ? (language === "en" && restaurant.location_en ? restaurant.location_en : restaurant.address)
                      : getDisplayLocation(restaurant, language)}
                  </span>
                </div>
              )}

              {/* Google 평점 (사용자 등록 맛집) */}
              {isCustomRestaurant && restaurant.google_rating && (
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-accent flex-shrink-0 fill-accent" />
                  <span className="text-sm">
                    {restaurant.google_rating.toFixed(1)}
                    {restaurant.google_reviews_count && (
                      <span className="text-muted-foreground ml-1">
                        ({t("restaurant.reviews_count", { count: restaurant.google_reviews_count.toLocaleString() })})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* 특징/메모 - 사용자 등록 맛집은 feature/feature_en, 정적 데이터는 특징 */}
              {(currentFeature || currentFeatureEn || restaurant.특징 || restaurant.feature_en) && (
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm">
                    {isCustomRestaurant
                      ? (language === "en" && currentFeatureEn ? currentFeatureEn : currentFeature)
                      : getDisplayFeature(restaurant, language)}
                  </span>
                </div>
              )}

              {/* 전화번호 - 사용자 등록 맛집은 phone_number 우선 사용 */}
              {(currentPhoneNumber || phoneNumber) && (
                <a
                  href={`tel:${currentPhoneNumber || phoneNumber}`}
                  className="flex items-center gap-3 hover:text-primary transition-colors"
                >
                  <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{currentPhoneNumber || phoneNumber}</span>
                </a>
              )}

              {/* 영업시간 (사용자 등록 맛집) */}
              {isCustomRestaurant && restaurant.opening_hours && restaurant.opening_hours.length > 0 && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm space-y-0.5">
                    {restaurant.opening_hours.map((hour, index) => (
                      <div key={index} className={hour.includes("휴무") ? "text-destructive" : ""}>
                        {hour}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 가격대 - DB에서 가져온 가격대 표시 */}
              {priceRange && (
                <div className="flex items-center gap-3">
                  <Banknote className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{priceRange}</span>
                </div>
              )}

              {/* 로딩 표시 (정적 데이터 맛집에서만) */}
              {!isCustomRestaurant && !infoLoaded && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 animate-pulse bg-muted rounded" />
                  <span className="text-sm animate-pulse">{t("restaurant.loading_info")}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 text-sm inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                <Map className="h-5 w-5" />
                {t("restaurant.view_on_google_maps")}
              </a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.coordinates?.lat},${restaurant.coordinates?.lng}&travelmode=transit`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 text-sm inline-flex items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground hover:bg-accent/80 font-medium"
              >
                <Navigation className="h-5 w-5" />
                {t("restaurant.directions")}
              </a>
            </div>
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

      {/* 카테고리 수정 모달 */}
      {isCustomRestaurant && restaurant.place_id && (
        <CategoryEditModal
          isOpen={categoryModalOpen}
          onClose={() => setCategoryModalOpen(false)}
          currentCategory={currentCategory}
          placeId={restaurant.place_id}
          restaurantName={restaurant.이름}
          onSuccess={(newCategory) => {
            setCurrentCategory(newCategory);
            onCategoryChange?.(newCategory);
          }}
        />
      )}

      {/* 상세 정보 수정 모달 */}
      {isCustomRestaurant && restaurant.place_id && (
        <RestaurantEditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          restaurant={{
            place_id: restaurant.place_id,
            name: restaurant.이름,
            address: restaurant.address || restaurant.위치 || "",
            category: currentCategory,
            feature: currentFeature,
            phone_number: currentPhoneNumber,
            opening_hours: restaurant.opening_hours,
            google_map_url: restaurant.google_map_url,
          }}
          onSuccess={(updatedData) => {
            if (updatedData.category) {
              setCurrentCategory(updatedData.category);
              onCategoryChange?.(updatedData.category);
            }
            if (updatedData.feature !== undefined) {
              setCurrentFeature(updatedData.feature || "");
            }
            if (updatedData.phone_number !== undefined) {
              setCurrentPhoneNumber(updatedData.phone_number || "");
              setPhoneNumber(updatedData.phone_number || null);
            }
            onUpdate?.(updatedData);
          }}
        />
      )}
    </div>
  );
}
