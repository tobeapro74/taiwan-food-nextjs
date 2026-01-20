"use client";

import { useState, useMemo, useEffect } from "react";
import { MapPin, Navigation, ChevronDown, ArrowLeft, Loader2, Search, X, Star } from "lucide-react";
import { useUserLocation, getMockLocationList } from "@/hooks/useUserLocation";
import { filterByRadius, RADIUS_OPTIONS } from "@/lib/geo-utils";
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

  // 주변 맛집 필터링
  const nearbyRestaurants = useMemo(() => {
    if (!coordinates) return [];

    const filtered = filterByRadius(allRestaurants, coordinates, selectedRadius);
    return filtered;
  }, [allRestaurants, coordinates, selectedRadius]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 shadow-sm safe-area-top">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="h-11 w-11 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors bg-black/5 dark:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">맛집알리미</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              주변 맛집을 찾아보세요
            </p>
          </div>
        </div>
      </div>

      {/* 위치 선택 섹션 */}
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            <span className="font-medium">
              {locationName || "위치를 선택하세요"}
            </span>
            {isMockLocation && (
              <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded">
                테스트
              </span>
            )}
          </div>
          <button
            onClick={() => setShowLocationPicker(!showLocationPicker)}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
          >
            위치 변경
            <ChevronDown className={`w-4 h-4 transition-transform ${showLocationPicker ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* 위치 선택 드롭다운 */}
        {showLocationPicker && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {/* 현재 위치 버튼 */}
            <div className="mb-3">
              <button
                onClick={() => {
                  requestLocation();
                  setShowLocationPicker(false);
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
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
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
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
                    className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {addressInput && (
                    <button
                      onClick={() => {
                        setAddressInput("");
                        clearSearchResults();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => searchAddress(addressInput)}
                  disabled={isSearching || !addressInput.trim()}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
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
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
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
                      className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
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
                className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1 hover:text-blue-500"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showManualInput ? "rotate-180" : ""}`} />
                직접 좌표 입력 (GPS 좌표)
              </button>

              {showManualInput && (
                <div className="p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-500">
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">위치 이름 (선택)</label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="예: 내 호텔, 현재 위치"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-500 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">위도 (Lat)</label>
                        <input
                          type="text"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          placeholder="25.0421"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-500 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">경도 (Lng)</label>
                        <input
                          type="text"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          placeholder="121.5074"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-500 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                    >
                      이 좌표로 설정
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Tip: 구글맵에서 위치를 길게 누르면 좌표를 복사할 수 있어요
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
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
                      ? "bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300"
                      : "bg-white dark:bg-gray-600 border-gray-200 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500"
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
          <div className="mt-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/30 p-2 rounded">
            {error}
          </div>
        )}

        {/* 반경 선택 */}
        {coordinates && (
          <div className="mt-3">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">검색 반경</div>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedRadius(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedRadius === option.value
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
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
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              위치를 선택하면 주변 맛집을 찾아드려요
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              위 버튼을 눌러 위치를 설정해주세요
            </p>
          </div>
        ) : isLoadingCustom ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              맛집 데이터를 불러오는 중...
            </p>
          </div>
        ) : nearbyRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {selectedRadius >= 1000 ? `${selectedRadius / 1000}km` : `${selectedRadius}m`} 이내에 맛집이 없습니다
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              검색 반경을 늘려보세요
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {selectedRadius >= 1000 ? `${selectedRadius / 1000}km` : `${selectedRadius}m`} 이내{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
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
      className="w-full text-left bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white truncate">{restaurant.이름}</h3>
          {isCustom && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
              {restaurant.category}
            </Badge>
          )}
        </div>
        <span className="text-sm font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded flex-shrink-0 ml-2">
          {distance}
        </span>
      </div>
      {restaurant.특징 && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
          {restaurant.특징}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[150px]">{restaurant.위치}</span>
        </span>
        {restaurant.평점 && (
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            {restaurant.평점.toFixed(1)}
            {restaurant.리뷰수 && (
              <span className="text-gray-400">({restaurant.리뷰수.toLocaleString()})</span>
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
