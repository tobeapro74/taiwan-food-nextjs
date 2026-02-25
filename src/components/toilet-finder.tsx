"use client";

import { useState, useEffect } from "react";
import { MapPin, Navigation, Clock, Phone, Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/language-provider";

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
  const { t } = useLanguage();
  const [storeType, setStoreType] = useState<StoreType>("7eleven");
  const [sevenElevenStores, setSevenElevenStores] = useState<SevenElevenStore[]>([]);
  const [familyMartStores, setFamilyMartStores] = useState<FamilyMartStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showOutsideTaiwanNotice, setShowOutsideTaiwanNotice] = useState(false);
  const [isSampleMode, setIsSampleMode] = useState(false);

  // 기본 위치 (시먼딩 행복당) - 개발 환경 및 대만 외 지역 폴백용
  const DEFAULT_TAIWAN_LOCATION = {
    lat: 25.0421,
    lng: 121.5074,
  };

  // Geolocation을 Promise로 감싸되, iOS WKWebView에서 콜백이 누락되는 경우를 대비한 수동 타임아웃 추가
  const getGeolocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GEOLOCATION_NOT_SUPPORTED"));
        return;
      }

      let settled = false;

      // iOS에서 권한 미설정 시 콜백이 호출되지 않는 경우 대비
      const fallbackTimeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("MANUAL_TIMEOUT"));
        }
      }, 15000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (settled) return;
          settled = true;
          clearTimeout(fallbackTimeout);
          resolve(position);
        },
        (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(fallbackTimeout);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  };

  // 위치 권한 요청 및 가까운 매장 검색
  const findNearbyToilets = async (type: StoreType) => {
    setLoading(true);
    setError(null);
    setLocationError(null);

    let latitude: number;
    let longitude: number;

    // 1단계: 위치 확보 (GPS 실패 시 시먼딩 기본 위치로 폴백)
    if (process.env.NODE_ENV === "development") {
      latitude = DEFAULT_TAIWAN_LOCATION.lat;
      longitude = DEFAULT_TAIWAN_LOCATION.lng;
    } else {
      try {
        const position = await getGeolocation();
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;

        // 대만 범위 밖이면 기본 대만 위치(시먼딩) 사용 + 알림 표시
        const isInTaiwan = latitude >= 21.9 && latitude <= 25.4 && longitude >= 119.3 && longitude <= 122.1;
        if (!isInTaiwan) {
          latitude = DEFAULT_TAIWAN_LOCATION.lat;
          longitude = DEFAULT_TAIWAN_LOCATION.lng;
          setIsSampleMode(true);
          setShowOutsideTaiwanNotice(true);
        }
      } catch {
        // GPS 실패 (권한 거부, 타임아웃, WKWebView 콜백 누락 등) → 시먼딩 폴백
        latitude = DEFAULT_TAIWAN_LOCATION.lat;
        longitude = DEFAULT_TAIWAN_LOCATION.lng;
        setIsSampleMode(true);
        setShowOutsideTaiwanNotice(true);
      }
    }
    setUserLocation({ lat: latitude, lng: longitude });

    // 2단계: API 호출 (위치 확보 실패와 관계없이 항상 진행)
    try {
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
          setError(t("toilet.no_store_nearby", { store: storeName }));
        }
      } else {
        setError(data.error || t("toilet.search_error"));
      }
    } catch {
      setError(t("toilet.error_retry"));
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

  // 구글맵 열기 (iOS PWA 호환)
  const openDirections = (store: SevenElevenStore | FamilyMartStore) => {
    let url: string;
    const storeLabel = 'name' in store ? store.name : '';
    const destName = encodeURIComponent(`${storeLabel} ${store.address}`);

    if (isSampleMode) {
      // 샘플 모드: 행복당 → 매장 길찾기 (핀에 이름 표시)
      const originName = encodeURIComponent('行福堂 西門町');
      url = `https://www.google.com/maps/dir/?api=1&origin=${originName}&destination=${destName}&travelmode=walking`;
    } else {
      url = store.google_maps_directions_url ||
        `https://www.google.com/maps/dir/?api=1&destination=${destName}&travelmode=walking`;
    }

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* 대만 외 지역 안내 모달 */}
      {showOutsideTaiwanNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="text-center mb-4">
              <span className="text-4xl">📍</span>
            </div>
            <h3 className="text-lg font-bold text-center text-foreground mb-3">
              {t("nearby.outside_taiwan_title")}
            </h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed mb-5">
              {t("nearby.outside_taiwan_desc")}
            </p>
            <button
              onClick={() => setShowOutsideTaiwanNotice(false)}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              {t("common.confirm")}
            </button>
          </div>
        </div>
      )}

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
              <h1 className="font-semibold text-foreground">{t("toilet.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("toilet.convenience_store")}</p>
            </div>
          </div>
        </div>

        {/* 탭 UI */}
        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => handleTabChange("7eleven")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              storeType === "7eleven"
                ? "bg-primary text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            🏪 7-ELEVEN
          </button>
          <button
            onClick={() => handleTabChange("familymart")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
              storeType === "familymart"
                ? "bg-primary text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            🏬 FamilyMart
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 새로고침 버튼 */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {userLocation
              ? t("toilet.within_2km")
              : t("toilet.getting_location")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => findNearbyToilets(storeType)}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("toilet.refresh")}
          </Button>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`bg-card rounded-2xl p-4 border ${i === 0 ? 'border-2 border-primary/30' : 'border-border/40'} shadow-card`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {i === 0 && <div className="animate-shimmer h-5 w-20 rounded-full" />}
                      <div className="animate-shimmer h-5 w-36 rounded-md" />
                    </div>
                    <div className="animate-shimmer h-4 w-full rounded-md" />
                    <div className="animate-shimmer h-4 w-32 rounded-md" />
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-3">
                    <div className="animate-shimmer h-8 w-16 rounded-md" />
                    <div className="animate-shimmer h-8 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 위치 오류 */}
        {locationError && !loading && (
          <Card className="border-accent/20 bg-accent/5 dark:bg-accent/10 dark:border-accent/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent dark:text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-accent-foreground font-medium">
                    {t("toilet.location_required")}
                  </p>
                  <p className="text-accent-foreground text-sm mt-1">
                    {locationError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => findNearbyToilets(storeType)}
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 에러 메시지 */}
        {error && !loading && !locationError && (
          <Card className="border-border">
            <CardContent className="p-4 text-center text-muted-foreground">
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
                className={`overflow-hidden transition-all duration-200 hover:shadow-card-hover cursor-pointer ${
                  index === 0
                    ? "border-primary border-2"
                    : "border-border/40"
                }`}
                onClick={() => openDirections(store)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between overflow-hidden">
                    <div className="flex-1 min-w-0 mr-3">
                      {/* 매장명 */}
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-medium shrink-0">
                            {t("toilet.nearest")}
                          </span>
                        )}
                        {store.services?.some(s => s.includes('ATM')) && (
                          <span className="px-2 py-0.5 bg-accent text-white text-xs rounded-full font-medium shrink-0">
                            ATM
                          </span>
                        )}
                        <h3 className="font-bold text-foreground truncate">
                          7-ELEVEN {store.name}
                        </h3>
                      </div>

                      {/* 주소 */}
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{store.address}</span>
                      </p>

                      {/* 영업시간 */}
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {store.opening_hours}
                          {store.opening_days && ` (${store.opening_days.replace("、", "")})`}
                        </span>
                      </p>

                      {/* 전화번호 */}
                      {store.phone && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{store.phone}</span>
                        </p>
                      )}
                    </div>

                    {/* 거리 및 길찾기 */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary">
                          {store.distance_text}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirections(store);
                        }}
                      >
                        <Navigation className="w-4 h-4" />
                        {t("toilet.directions")}
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
                className={`overflow-hidden transition-all duration-200 hover:shadow-card-hover cursor-pointer ${
                  index === 0
                    ? "border-primary border-2"
                    : "border-border/40"
                }`}
                onClick={() => openDirections(store)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between overflow-hidden">
                    <div className="flex-1 min-w-0 mr-3">
                      {/* 매장명 */}
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full font-medium shrink-0">
                            {t("toilet.nearest")}
                          </span>
                        )}
                        <h3 className="font-bold text-foreground truncate">
                          {store.name}
                        </h3>
                      </div>

                      {/* 주소 */}
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{store.address}</span>
                      </p>

                      {/* 영업 상태 */}
                      {store.opening_hours && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className={store.opening_hours.open_now ? "text-primary" : "text-destructive"}>
                            {store.opening_hours.open_now ? t("toilet.open_now") : t("toilet.closed")}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* 거리 및 길찾기 */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary">
                          {store.distance_text}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDirections(store);
                        }}
                      >
                        <Navigation className="w-4 h-4" />
                        {t("toilet.directions")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 안내 문구 */}
        <div className="mt-6 mb-24 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground text-center whitespace-pre-line">
            {storeType === "7eleven" ? t("toilet.seven_notice") : t("toilet.family_notice")}
          </p>
        </div>
      </div>
    </div>
  );
}
