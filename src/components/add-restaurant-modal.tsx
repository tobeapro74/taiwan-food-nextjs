"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Search, MapPin, Star, Clock, Phone, Globe, ChevronRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: number; name: string } | null;
  onSuccess?: () => void;
}

interface PlaceSearchResult {
  place_id: string;
  name: string;
  description: string;
  secondary_text: string;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  rating?: number;
  reviews_count?: number;
  price_level?: number;
  price_level_text?: string;
  phone_number?: string;
  opening_hours?: string[];
  photos?: string[];
  website?: string;
  google_map_url?: string;
  suggested_category?: string;
}

const categories = [
  { id: "면류", name: "면류", icon: "🍜" },
  { id: "만두", name: "만두", icon: "🥟" },
  { id: "밥류", name: "밥류", icon: "🍚" },
  { id: "디저트", name: "디저트", icon: "🧁" },
  { id: "길거리음식", name: "길거리음식", icon: "🍢" },
  { id: "카페", name: "카페", icon: "☕" },
  { id: "훠궈", name: "훠궈", icon: "🍲" },
  { id: "기타", name: "기타", icon: "🍽️" },
];

export function AddRestaurantModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: AddRestaurantModalProps) {
  const [step, setStep] = useState<"search" | "details" | "confirm">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [feature, setFeature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 모달 닫힐 때 초기화
  useEffect(() => {
    if (!isOpen) {
      setStep("search");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedPlace(null);
      setSelectedCategory("");
      setFeature("");
    }
  }, [isOpen]);

  // 검색어 변경 시 자동 검색 (디바운스)
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/google-place-details?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results) {
          setSearchResults(data.results);
        }
      } catch (error) {
        console.error("검색 오류:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // 장소 선택 시 상세 정보 조회
  const handleSelectPlace = async (placeId: string) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch("/api/google-place-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        setSelectedPlace(data.data);
        setSelectedCategory(data.data.suggested_category || "밥류");
        setStep("details");
      } else {
        alert(data.error || "장소 정보를 가져올 수 없습니다.");
      }
    } catch (error) {
      console.error("상세 정보 조회 오류:", error);
      alert("장소 정보 조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // 맛집 등록
  const handleSubmit = async () => {
    if (!selectedPlace || !selectedCategory) {
      alert("카테고리를 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/custom-restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: selectedPlace.place_id,
          name: selectedPlace.name,
          address: selectedPlace.address,
          category: selectedCategory,
          feature: feature.trim(),
          coordinates: selectedPlace.coordinates,
          google_rating: selectedPlace.rating,
          google_reviews_count: selectedPlace.reviews_count,
          price_level: selectedPlace.price_level,
          phone_number: selectedPlace.phone_number,
          opening_hours: selectedPlace.opening_hours,
          photos: selectedPlace.photos,
          website: selectedPlace.website,
          google_map_url: selectedPlace.google_map_url,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStep("confirm");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        alert(data.error || "맛집 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("등록 오류:", error);
      alert("맛집 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-lg rounded-2xl max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex-shrink-0 border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold">
            {step === "search" && "맛집 검색"}
            {step === "details" && "맛집 정보"}
            {step === "confirm" && "등록 완료"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색 단계 */}
        {step === "search" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 검색창 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="구글맵에서 맛집 검색..."
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
              )}
            </div>

            {/* 안내 문구 */}
            {searchQuery.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-primary/30" />
                <p className="text-sm">대만에서 발견한 맛집을</p>
                <p className="text-sm">구글맵 이름으로 검색해보세요!</p>
              </div>
            )}

            {/* 검색 결과 */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectPlace(result.place_id)}
                    disabled={isLoadingDetails}
                    className="w-full p-3 flex items-center gap-3 rounded-xl border hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {result.secondary_text}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* 검색 결과 없음 */}
            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">검색 결과가 없습니다.</p>
                <p className="text-xs mt-1">다른 검색어를 시도해보세요.</p>
              </div>
            )}
          </div>
        )}

        {/* 상세 정보 단계 */}
        {step === "details" && selectedPlace && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 사진 */}
              {selectedPlace.photos && selectedPlace.photos.length > 0 && (
                <div className="relative h-40 rounded-xl overflow-hidden bg-muted">
                  <Image
                    src={selectedPlace.photos[0]}
                    alt={selectedPlace.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}

              {/* 기본 정보 */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{selectedPlace.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedPlace.address}</span>
                </div>

                {/* 평점 & 리뷰 */}
                {selectedPlace.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{selectedPlace.rating}</span>
                    {selectedPlace.reviews_count && (
                      <span className="text-sm text-muted-foreground">
                        ({selectedPlace.reviews_count.toLocaleString()}개 리뷰)
                      </span>
                    )}
                  </div>
                )}

                {/* 가격대 */}
                {selectedPlace.price_level_text && (
                  <div className="text-sm text-muted-foreground">
                    가격대: {selectedPlace.price_level_text}
                  </div>
                )}

                {/* 전화번호 */}
                {selectedPlace.phone_number && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{selectedPlace.phone_number}</span>
                  </div>
                )}

                {/* 웹사이트 */}
                {selectedPlace.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="w-4 h-4" />
                    <a
                      href={selectedPlace.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      웹사이트 방문
                    </a>
                  </div>
                )}

                {/* 영업시간 */}
                {selectedPlace.opening_hours && selectedPlace.opening_hours.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      <span>영업시간</span>
                    </div>
                    <div className="pl-6 text-xs text-muted-foreground space-y-0.5">
                      {selectedPlace.opening_hours.map((hour, idx) => (
                        <p key={idx}>{hour}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 카테고리 선택 */}
              <div className="space-y-3">
                <p className="font-medium">카테고리 선택 *</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "px-3 py-2 rounded-full border text-sm flex items-center gap-1",
                        selectedCategory === cat.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      )}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 특징/메모 */}
              <div className="space-y-2">
                <p className="font-medium">특징/메모 (선택)</p>
                <textarea
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                  placeholder="이 맛집의 특징이나 추천 메뉴를 적어주세요..."
                  className="w-full h-24 p-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-sm"
                />
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="flex-shrink-0 border-t p-4 bg-background rounded-b-2xl space-y-2">
              <Button
                onClick={handleSubmit}
                disabled={!selectedCategory || isSubmitting}
                className="w-full py-5 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  "맛집 등록하기"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("search");
                  setSelectedPlace(null);
                }}
                className="w-full"
              >
                다른 맛집 검색
              </Button>
            </div>
          </>
        )}

        {/* 완료 단계 */}
        {step === "confirm" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">등록 완료!</h3>
            <p className="text-muted-foreground text-center">
              맛집이 성공적으로 등록되었습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
