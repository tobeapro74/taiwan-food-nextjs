"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Clock, Phone, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type StoreType = "7eleven" | "familymart";

interface SevenElevenStore {
  _id: string;
  poi_id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone: string;
  opening_hours: string;
  opening_days: string;
  services: string[];
  distance_text?: string;
  distance_km?: number;
  google_maps_directions_url?: string;
}

interface FamilyMartStore {
  place_id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  opening_hours?: {
    open_now?: boolean;
  };
  distance_text?: string;
  distance_km?: number;
  google_maps_directions_url?: string;
}

interface ToiletFinderProps {
  onClose?: () => void;
}

export function ToiletFinder({ onClose }: ToiletFinderProps) {
  const [storeType, setStoreType] = useState<StoreType>("7eleven");
  const [sevenElevenStores, setSevenElevenStores] = useState<SevenElevenStore[]>([]);
  const [familyMartStores, setFamilyMartStores] = useState<FamilyMartStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 개발 환경용 mock 위치 (시먼딩 행복당)
  const DEV_MOCK_LOCATION = {
    lat: 25.0421,
    lng: 121.5074,
  };

  // 위치 권한 요청 및 가까운 매장 검색
  const findNearbyToilets = async (type: StoreType) => {
    setLoading(true);
    setError(null);
    setLocationError(null);

    try {
      let latitude: number;
      let longitude: number;

      // 개발 환경에서는 mock 위치 사용
      if (process.env.NODE_ENV === "development") {
        latitude = DEV_MOCK_LOCATION.lat;
        longitude = DEV_MOCK_LOCATION.lng;
        console.log("🧪 개발 모드: 시먼딩 행복당 위치 사용", { latitude, longitude });
      } else {
        // 프로덕션에서는 실제 위치 사용
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }
      setUserLocation({ lat: latitude, lng: longitude });

      // API 호출 (타입에 따라 다른 엔드포인트)
      const endpoint = type === "7eleven"
        ? `/api/seven-eleven-toilet?lat=${latitude}&lng=${longitude}&limit=5&maxDistance=2`
        : `/api/familymart-toilet?lat=${latitude}&lng=${longitude}&limit=5&maxDistance=2`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.success) {
        if (type === "7eleven") {
          setSevenElevenStores(data.data);
        } else {
          setFamilyMartStores(data.data);
        }
        if (data.data.length === 0) {
          const storeName = type === "7eleven" ? "7-ELEVEN" : "FamilyMart";
          setError(`2km 이내에 ${storeName}이(가) 없습니다.`);
        }
      } else {
        setError(data.error || "검색 중 오류가 발생했습니다.");
      }
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError("위치 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.");
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError("위치 정보를 가져올 수 없습니다.");
            break;
          case err.TIMEOUT:
            setLocationError("위치 요청 시간이 초과되었습니다.");
            break;
        }
      } else {
        setError("오류가 발생했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 자동으로 검색 시작
  useEffect(() => {
    findNearbyToilets(storeType);
  }, []);

  // 탭 변경 시 해당 매장 검색
  const handleTabChange = (type: StoreType) => {
    setStoreType(type);
    setError(null);

    // 해당 타입의 데이터가 없으면 검색
    if (type === "7eleven" && sevenElevenStores.length === 0) {
      findNearbyToilets(type);
    } else if (type === "familymart" && familyMartStores.length === 0) {
      findNearbyToilets(type);
    }
  };

  // 구글맵 길찾기 열기 (iOS PWA 호환)
  const openDirections = (store: SevenElevenStore | FamilyMartStore) => {
    const url = store.google_maps_directions_url ||
      `https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}&travelmode=walking`;

    // Create and click a link element for better iOS PWA support
    // window.open can cause blank page issues on iOS PWA
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm safe-area-top">
        <div className="flex items-center gap-2 p-3">
          {onClose && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xl">🚽</span>
            <div>
              <h1 className="font-semibold text-foreground">가까운 화장실 찾기</h1>
              <p className="text-xs text-muted-foreground">편의점 화장실</p>
            </div>
          </div>
        </div>

        {/* 탭 UI */}
        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => handleTabChange("7eleven")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              storeType === "7eleven"
                ? "bg-green-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            🏪 7-ELEVEN
          </button>
          <button
            onClick={() => handleTabChange("familymart")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              storeType === "familymart"
                ? "bg-blue-500 text-white shadow-md"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            🏬 FamilyMart
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 새로고침 버튼 */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {userLocation
              ? "현재 위치 기준 2km 이내"
              : "위치 정보를 가져오는 중..."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => findNearbyToilets(storeType)}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-green-500" />
            <p className="text-gray-600 dark:text-gray-400">
              가까운 화장실을 찾는 중...
            </p>
          </div>
        )}

        {/* 위치 오류 */}
        {locationError && !loading && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 dark:text-amber-200 font-medium">
                    위치 권한 필요
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                    {locationError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => findNearbyToilets(storeType)}
                  >
                    다시 시도
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 에러 메시지 */}
        {error && !loading && !locationError && (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 text-center text-gray-600 dark:text-gray-400">
              {error}
            </CardContent>
          </Card>
        )}

        {/* 7-ELEVEN 매장 목록 */}
        {!loading && !locationError && storeType === "7eleven" && sevenElevenStores.length > 0 && (
          <div className="space-y-3">
            {sevenElevenStores.map((store, index) => (
              <Card
                key={store._id}
                className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                  index === 0
                    ? "border-green-500 dark:border-green-400 border-2"
                    : "border-gray-200 dark:border-gray-700"
                }`}
                onClick={() => openDirections(store)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between overflow-hidden">
                    <div className="flex-1 min-w-0 mr-3">
                      {/* 매장명 */}
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium shrink-0">
                            가장 가까움
                          </span>
                        )}
                        {store.services?.some(s => s.includes('ATM')) && (
                          <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full font-medium shrink-0">
                            ATM
                          </span>
                        )}
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">
                          7-ELEVEN {store.name}
                        </h3>
                      </div>

                      {/* 주소 */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{store.address}</span>
                      </p>

                      {/* 영업시간 */}
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {store.opening_hours}
                          {store.opening_days && ` (${store.opening_days.replace("、", "")})`}
                        </span>
                      </p>

                      {/* 전화번호 */}
                      {store.phone && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{store.phone}</span>
                        </p>
                      )}
                    </div>

                    {/* 거리 및 길찾기 */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {store.distance_text}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirections(store);
                        }}
                      >
                        <Navigation className="w-4 h-4" />
                        길찾기
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* FamilyMart 매장 목록 */}
        {!loading && !locationError && storeType === "familymart" && familyMartStores.length > 0 && (
          <div className="space-y-3">
            {familyMartStores.map((store, index) => (
              <Card
                key={store.place_id}
                className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                  index === 0
                    ? "border-blue-500 dark:border-blue-400 border-2"
                    : "border-gray-200 dark:border-gray-700"
                }`}
                onClick={() => openDirections(store)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between overflow-hidden">
                    <div className="flex-1 min-w-0 mr-3">
                      {/* 매장명 */}
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-medium shrink-0">
                            가장 가까움
                          </span>
                        )}
                        <h3 className="font-bold text-gray-900 dark:text-white truncate">
                          {store.name}
                        </h3>
                      </div>

                      {/* 주소 */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{store.address}</span>
                      </p>

                      {/* 영업 상태 */}
                      {store.opening_hours && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className={store.opening_hours.open_now ? "text-green-600" : "text-red-500"}>
                            {store.opening_hours.open_now ? "영업 중" : "영업 종료"}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* 거리 및 길찾기 */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {store.distance_text}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirections(store);
                        }}
                      >
                        <Navigation className="w-4 h-4" />
                        길찾기
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 안내 문구 */}
        <div className="mt-6 mb-24 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {storeType === "7eleven" ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              💡 7-ELEVEN 매장 중 화장실을 개방하는 매장만 표시됩니다.
              <br />
              데이터는 매일 오전 6시에 자동 업데이트됩니다.
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              💡 대만 FamilyMart(全家)는 대부분 화장실을 이용할 수 있습니다.
              <br />
              일부 매장은 화장실이 없거나 직원 전용일 수 있습니다.
              <br />
              데이터는 매일 오전 7시에 자동 업데이트됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
