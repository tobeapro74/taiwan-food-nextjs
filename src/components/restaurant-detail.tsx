"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Info, Map, Phone, Banknote, Building2, Edit3, Tag, Settings, Trash2 } from "lucide-react";
import { Restaurant, getGoogleMapsLink, getUnsplashImage, categories } from "@/data/taiwan-food";
import { ReviewSection } from "@/components/review-section";
import { GoogleReviews } from "@/components/google-reviews";
import { CategoryEditModal } from "@/components/category-edit-modal";
import { RestaurantEditModal } from "@/components/restaurant-edit-modal";
import Image from "next/image";

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
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(restaurant.phone_number || "");
  const [isDeleting, setIsDeleting] = useState(false);

  // 사용자 등록 맛집인지 확인 (place_id가 있으면 사용자 등록 맛집)
  const isCustomRestaurant = !!restaurant.place_id;

  // 수정 권한 확인 (등록자 본인 또는 관리자)
  const canEdit = user && isCustomRestaurant && (
    user.is_admin || restaurant.registered_by === user.id
  );

  // 카테고리 아이콘 및 이름 가져오기
  const getCategoryInfo = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? { icon: cat.icon, name: cat.name } : { icon: "🍽️", name: categoryId };
  };

  // 맛집 삭제 핸들러
  const handleDelete = async () => {
    if (!restaurant.place_id) return;
    if (!confirm(`"${restaurant.이름}"을(를) 삭제하시겠습니까?\n\n삭제된 맛집은 복구할 수 없습니다.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/custom-restaurants?placeId=${encodeURIComponent(restaurant.place_id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        alert("맛집이 삭제되었습니다.");
        onDelete?.();
        onBack();
      } else {
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

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
          <h1 className="font-semibold truncate flex-1">{restaurant.이름}</h1>
          {/* 수정/삭제 버튼 (사용자 등록 맛집 + 권한 있는 경우) */}
          {canEdit && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditModalOpen(true)}
                className="h-9 w-9 text-muted-foreground hover:text-primary"
                title="맛집 정보 수정"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                title="맛집 삭제"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          )}
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
            <div className="flex flex-wrap gap-2 items-center">
              {/* 카테고리 배지 (사용자 등록 맛집인 경우) */}
              {isCustomRestaurant && currentCategory && (
                <Badge
                  className="bg-primary/10 text-primary border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => canEdit && setCategoryModalOpen(true)}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {getCategoryInfo(currentCategory).icon} {getCategoryInfo(currentCategory).name}
                  {canEdit && <Edit3 className="h-3 w-3 ml-1" />}
                </Badge>
              )}
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
