"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Clock, Phone, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ToiletStore {
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

interface ToiletFinderProps {
  onClose?: () => void;
}

export function ToiletFinder({ onClose }: ToiletFinderProps) {
  const [stores, setStores] = useState<ToiletStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 위치 권한 요청 및 가까운 매장 검색
  const findNearbyToilets = async () => {
    setLoading(true);
    setError(null);
    setLocationError(null);

    try {
      // 위치 권한 요청
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });

      // API 호출
      const res = await fetch(
        `/api/seven-eleven-toilet?lat=${latitude}&lng=${longitude}&limit=5&maxDistance=3`
      );
      const data = await res.json();

      if (data.success) {
        setStores(data.data);
        if (data.data.length === 0) {
          setError("3km 이내에 화장실이 있는 7-ELEVEN이 없습니다.");
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
    findNearbyToilets();
  }, []);

  // 구글맵 길찾기 열기
  const openDirections = (store: ToiletStore) => {
    const url = store.google_maps_directions_url ||
      `https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}&travelmode=walking`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl">🚽</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                가까운 화장실 찾기
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                7-ELEVEN 화장실
              </p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              닫기
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 새로고침 버튼 */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {userLocation
              ? `현재 위치 기준 3km 이내`
              : "위치 정보를 가져오는 중..."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={findNearbyToilets}
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
                    onClick={findNearbyToilets}
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

        {/* 매장 목록 */}
        {!loading && !locationError && stores.length > 0 && (
          <div className="space-y-3">
            {stores.map((store, index) => (
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 매장명 */}
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
                            가장 가까움
                          </span>
                        )}
                        <h3 className="font-bold text-gray-900 dark:text-white">
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
                    <div className="flex flex-col items-end gap-2 ml-4">
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

        {/* 안내 문구 */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 7-ELEVEN 매장 중 화장실을 개방하는 매장만 표시됩니다.
            <br />
            데이터는 매일 오전 6시에 자동 업데이트됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
