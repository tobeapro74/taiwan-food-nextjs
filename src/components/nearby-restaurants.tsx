"use client";

import { useState, useMemo, useEffect } from "react";
import { MapPin, Navigation, ChevronDown, ArrowLeft, Loader2, Search, X, Star } from "lucide-react";
import { useUserLocation, getMockLocationList } from "@/hooks/useUserLocation";
import { filterByRadius, RADIUS_OPTIONS, MOCK_LOCATIONS } from "@/lib/geo-utils";
import { taiwanFoodMap, Restaurant } from "@/data/taiwan-food";
import { Badge } from "@/components/ui/badge";

// 사용자 등록 맛집 타입
interface CustomRestaurant {
  place_id: string;
  name: string;
  address: string;
  category: string;
  feature?: string;
  coordinates: { lat: number; lng: number };
  google_rating?: number;
  google_reviews_count?: number;
  registered_by?: number;
}

interface NearbyRestaurantsProps {
  onSelectRestaurant: (restaurant: Restaurant) => void;
  onBack: () => void;
}

/**
 * 맛집알리미 - 주변 맛집 찾기 컴포넌트
 */
export function NearbyRestaurants({ onSelectRestaurant, onBack }: NearbyRestaurantsProps) {
  const {
    coordinates,
    locationName,
    error,
    isLoading,
    isMockLocation,
    isSearching,
    searchResults,
    requestLocation,
    setMockLocation,
    searchAddress,
    selectSearchResult,
    clearSearchResults,
    setManualCoordinates,
  } = useUserLocation();

  const [selectedRadius, setSelectedRadius] = useState(500); // 기본 500m
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [manualName, setManualName] = useState("");
  const [customRestaurants, setCustomRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingCustom, setIsLoadingCustom] = useState(false);

  const mockLocations = getMockLocationList();

  // 사용자 등록 맛집 가져오기
  useEffect(() => {
    const fetchCustomRestaurants = async () => {
      setIsLoadingCustom(true);
      try {
        const res = await fetch("/api/custom-restaurants");
        const data = await res.json();
        if (data.success && data.data) {
          // CustomRestaurant를 Restaurant 형식으로 변환
          const converted: Restaurant[] = data.data.map((r: CustomRestaurant) => ({
            이름: r.name,
            위치: r.address,
            특징: r.feature || "",
            평점: r.google_rating,
            리뷰수: r.google_reviews_count,
            coordinates: r.coordinates,
            place_id: r.place_id,
            category: r.category,
            registered_by: r.registered_by,
          }));
          setCustomRestaurants(converted);
        }
      } catch (error) {
        console.error("사용자 등록 맛집 로드 실패:", error);
      } finally {
        setIsLoadingCustom(false);
      }
    };

    fetchCustomRestaurants();
  }, []);

  // 모든 맛집 데이터를 하나의 배열로 합침 (정적 데이터 + 사용자 등록 맛집)
  const allRestaurants = useMemo(() => {
    const categories = ["면류", "만두", "밥류", "탕류", "디저트", "길거리음식", "카페", "까르푸"] as const;
    const restaurants: Restaurant[] = [];

    categories.forEach((category) => {
      const items = taiwanFoodMap[category];
      if (items) {
        restaurants.push(...items);
      }
    });

    // 사용자 등록 맛집 추가
    restaurants.push(...customRestaurants);

    return restaurants;
  }, [customRestaurants]);

  const [showOutsideTaiwanNotice, setShowOutsideTaiwanNotice] = useState(false);

  // 대만 영역 확인 (위도 21.9~25.4, 경도 119.3~122.1)
  const isInTaiwan = useMemo(() => {
    if (!coordinates) return false;
    return (
      coordinates.lat >= 21.9 && coordinates.lat <= 25.4 &&
      coordinates.lng >= 119.3 && coordinates.lng <= 122.1
    );
  }, [coordinates]);

  // 대만 밖 위치 감지 시 자동으로 시먼딩으로 전환 + 알림 표시
  useEffect(() => {
    if (coordinates && !isInTaiwan && !isMockLocation) {
      const defaultLocation = MOCK_LOCATIONS["시먼딩"];
      if (defaultLocation) {
        setShowOutsideTaiwanNotice(true);
        setMockLocation("시먼딩");
      }
    }
  }, [coordinates, isInTaiwan, isMockLocation, setMockLocation]);

  // 주변 맛집 필터링
  const nearbyRestaurants = useMemo(() => {
    if (!coordinates) return [];

    const filtered = filterByRadius(allRestaurants, coordinates, selectedRadius);
    return filtered;
  }, [allRestaurants, coordinates, selectedRadius]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 대만 외 지역 안내 모달 */}
      {showOutsideTaiwanNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center mb-4">
              <span className="text-4xl">📍</span>
            </div>
            <h3 className="text-lg font-bold text-center text-foreground mb-3">
              대만 외 지역 감지
            </h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-5">
              이 서비스는 대만 타이베이 내에서 이용 가능합니다.
              현재 대만 외 지역에 계시므로, 시먼딩(西門町) 기준의 샘플 데이터를 보여드립니다.
            </p>
            <button
              onClick={() => setShowOutsideTaiwanNotice(false)}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-card border-b border-border px-3 py-2 shadow-sm safe-area-top">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="h-11 w-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-muted rounded-full transition-colors bg-black/5"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">맛집알리미</h1>
            <p className="text-sm text-muted-foreground">
              주변 맛집을 찾아보세요
            </p>
          </div>
        </div>
      </div>

      {/* 위치 선택 섹션 */}
      <div className="bg-card p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="font-medium">
              {locationName || "위치를 선택하세요"}
            </span>
            {isMockLocation && (
              <span className="text-xs bg-accent/10 dark:bg-accent/20 text-accent-foreground px-2 py-0.5 rounded">
                테스트
              </span>
            )}
          </div>
          <button
            onClick={() => setShowLocationPicker(!showLocationPicker)}
            className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            위치 변경
            <ChevronDown className={`w-4 h-4 transition-transform ${showLocationPicker ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* 위치 선택 드롭다운 */}
        {showLocationPicker && (
          <div className="mt-3 p-3 bg-muted rounded-lg">
            {/* 현재 위치 버튼 */}
            <div className="mb-3">
              <button
                onClick={() => {
                  requestLocation();
                  setShowLocationPicker(false);
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                현재 위치 사용
              </button>
            </div>

            {/* 주소 검색 입력창 */}
            <div className="mb-3">
              <div className="text-xs text-muted-foreground mb-2">
                또는 주소로 검색:
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && addressInput.trim()) {
                        searchAddress(addressInput);
                      }
                    }}
                    placeholder="예: 시먼딩, 타이베이역, 西門町..."
                    className="w-full px-3 py-2 pr-8 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {addressInput && (
                    <button
                      onClick={() => {
                        setAddressInput("");
                        clearSearchResults();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => searchAddress(addressInput)}
                  disabled={isSearching || !addressInput.trim()}
                  className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 검색 결과 목록 */}
            {searchResults.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-muted-foreground mb-2">
                  검색 결과:
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        selectSearchResult(result);
                        setAddressInput("");
                        setShowLocationPicker(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{result.displayName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 직접 좌표 입력 */}
            <div className="mb-3">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-xs text-muted-foreground mb-2 flex items-center gap-1 hover:text-primary"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showManualInput ? "rotate-180" : ""}`} />
                직접 좌표 입력 (GPS 좌표)
              </button>

              {showManualInput && (
                <div className="p-3 bg-card rounded-lg border border-border">
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-muted-foreground">위치 이름 (선택)</label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="예: 내 호텔, 현재 위치"
                        className="w-full px-3 py-1.5 text-sm border border-border rounded bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">위도 (Lat)</label>
                        <input
                          type="text"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          placeholder="25.0421"
                          className="w-full px-3 py-1.5 text-sm border border-border rounded bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">경도 (Lng)</label>
                        <input
                          type="text"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          placeholder="121.5074"
                          className="w-full px-3 py-1.5 text-sm border border-border rounded bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const lat = parseFloat(manualLat);
                        const lng = parseFloat(manualLng);
                        if (!isNaN(lat) && !isNaN(lng)) {
                          setManualCoordinates(lat, lng, manualName || undefined);
                          setShowLocationPicker(false);
                          setShowManualInput(false);
                          setManualLat("");
                          setManualLng("");
                          setManualName("");
                        }
                      }}
                      disabled={!manualLat || !manualLng || isNaN(parseFloat(manualLat)) || isNaN(parseFloat(manualLng))}
                      className="w-full px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      이 좌표로 설정
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground/70">
                    Tip: 구글맵에서 위치를 길게 누르면 좌표를 복사할 수 있어요
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground mb-2">
              또는 테스트 위치 선택:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {mockLocations.map((location) => (
                <button
                  key={location.key}
                  onClick={() => {
                    setMockLocation(location.key);
                    setShowLocationPicker(false);
                  }}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    locationName === location.name
                      ? "bg-primary/10 dark:bg-primary/20 border-primary text-primary"
                      : "bg-card border-border hover:bg-muted"
                  }`}
                >
                  {location.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mt-2 text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 p-2 rounded">
            {error}
          </div>
        )}

        {/* 반경 선택 */}
        {coordinates && (
          <div className="mt-3">
            <div className="text-sm text-muted-foreground mb-2">검색 반경</div>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedRadius(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedRadius === option.value
                      ? "bg-primary text-white"
                      : "bg-muted text-foreground/70 hover:bg-muted/80"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 맛집 목록 */}
      <div className="flex-1 overflow-y-auto p-4">
        {!coordinates ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">
              위치를 선택하면 주변 맛집을 찾아드려요
            </p>
            <p className="text-sm text-muted-foreground/70">
              위 버튼을 눌러 위치를 설정해주세요
            </p>
          </div>
        ) : isLoadingCustom ? (
          <div className="space-y-3">
            <div className="animate-shimmer h-4 w-40 rounded-md mb-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border/40 shadow-card">
                <div className="flex justify-between items-start mb-2">
                  <div className="animate-shimmer h-5 w-32 rounded-md" />
                  <div className="animate-shimmer h-6 w-16 rounded-full" />
                </div>
                <div className="animate-shimmer h-4 w-full rounded-md mb-2" />
                <div className="flex gap-3">
                  <div className="animate-shimmer h-3 w-24 rounded-md" />
                  <div className="animate-shimmer h-3 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : nearbyRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">
              {selectedRadius >= 1000 ? `${selectedRadius / 1000}km` : `${selectedRadius}m`} 이내에 맛집이 없습니다
            </p>
            <p className="text-sm text-muted-foreground/70">
              검색 반경을 늘려보세요
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-3">
              {selectedRadius >= 1000 ? `${selectedRadius / 1000}km` : `${selectedRadius}m`} 이내{" "}
              <span className="font-medium text-foreground/70">
                {nearbyRestaurants.length}개
              </span>
              의 맛집
            </div>
            <div className="space-y-3">
              {nearbyRestaurants.map((item, index) => (
                <NearbyRestaurantCard
                  key={`${item.이름}-${index}`}
                  restaurant={item}
                  distance={item.formattedDistance}
                  onSelect={() => onSelectRestaurant(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface NearbyRestaurantCardProps {
  restaurant: Restaurant;
  distance: string;
  onSelect: () => void;
}

function NearbyRestaurantCard({ restaurant, distance, onSelect }: NearbyRestaurantCardProps) {
  const isCustom = !!restaurant.place_id;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left bg-card rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all duration-200 border border-border/40"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">{restaurant.이름}</h3>
          {isCustom && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
              {restaurant.category}
            </Badge>
          )}
        </div>
        <span className="text-sm font-medium text-primary bg-primary/5 dark:bg-primary/10 px-2 py-0.5 rounded flex-shrink-0 ml-2">
          {distance}
        </span>
      </div>
      {restaurant.특징 && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {restaurant.특징}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[150px]">{restaurant.위치}</span>
        </span>
        {restaurant.평점 && (
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-accent fill-accent" />
            {restaurant.평점.toFixed(1)}
            {restaurant.리뷰수 && (
              <span className="text-muted-foreground/70">({restaurant.리뷰수.toLocaleString()})</span>
            )}
          </span>
        )}
        {restaurant.가격대 && (
          <span>{restaurant.가격대}</span>
        )}
      </div>
    </button>
  );
}
