"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/taiwan-food";

// 좌표 형식 감지 정규식: (25.055701, 121.519953) 또는 25.055701, 121.519953
const COORDINATE_REGEX = /^\s*\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?\s*$/;

interface RestaurantData {
  place_id: string;
  name: string;
  address: string;
  category: string;
  feature?: string;
  phone_number?: string;
  opening_hours?: string[];
  google_map_url?: string;
  coordinates?: { lat: number; lng: number };
}

interface RestaurantEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: RestaurantData;
  onSuccess: (updatedData: Partial<RestaurantData>) => void;
}

export function RestaurantEditModal({
  isOpen,
  onClose,
  restaurant,
  onSuccess,
}: RestaurantEditModalProps) {
  const [category, setCategory] = useState(restaurant.category);
  const [feature, setFeature] = useState(restaurant.feature || "");
  const [phoneNumber, setPhoneNumber] = useState(restaurant.phone_number || "");
  const [openingHours, setOpeningHours] = useState(restaurant.opening_hours?.join("\n") || "");
  const [address, setAddress] = useState(restaurant.address);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    restaurant.coordinates || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isConvertingAddress, setIsConvertingAddress] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // 모달이 열릴 때 초기값 설정 및 배경 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      setCategory(restaurant.category);
      setFeature(restaurant.feature || "");
      setPhoneNumber(restaurant.phone_number || "");
      setOpeningHours(restaurant.opening_hours?.join("\n") || "");
      setAddress(restaurant.address);
      setCoordinates(restaurant.coordinates || null);
      setError("");
      // 배경 스크롤 방지
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, restaurant]);

  // 좌표를 주소로 변환하는 함수
  const convertCoordinatesToAddress = useCallback(async (lat: number, lng: number) => {
    setIsConvertingAddress(true);
    try {
      const res = await fetch("/api/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (data.success) {
        setAddress(data.data.address);
        setCoordinates({ lat, lng });
      } else {
        setError(data.error || "주소 변환에 실패했습니다.");
      }
    } catch {
      setError("주소 변환 중 오류가 발생했습니다.");
    } finally {
      setIsConvertingAddress(false);
    }
  }, []);

  // 주소 입력 처리 (좌표 감지 포함)
  const handleAddressChange = useCallback((value: string) => {
    setAddress(value);

    // 좌표 형식인지 확인
    const match = value.match(COORDINATE_REGEX);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      // 유효한 좌표인지 확인 (대만 근처 범위)
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        convertCoordinatesToAddress(lat, lng);
      }
    }
  }, [convertCoordinatesToAddress]);

  if (!isOpen) return null;

  // "전체" 카테고리 제외
  const availableCategories = categories.filter((cat) => cat.id !== "전체");

  // 저장 버튼 클릭 시 확인 모달 표시
  const handleSaveClick = () => {
    // 변경사항이 있는지 확인
    const hasChanges =
      category !== restaurant.category ||
      feature !== (restaurant.feature || "") ||
      phoneNumber !== (restaurant.phone_number || "") ||
      address !== restaurant.address ||
      JSON.stringify(openingHours.split("\n").filter(h => h.trim())) !==
        JSON.stringify(restaurant.opening_hours || []);

    if (!hasChanges) {
      onClose();
      return;
    }

    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    setError("");

    try {
      // 변경된 필드만 수집
      const updates: Record<string, unknown> = {};

      if (category !== restaurant.category) {
        updates.category = category;
      }
      if (feature !== (restaurant.feature || "")) {
        updates.feature = feature;
      }
      if (phoneNumber !== (restaurant.phone_number || "")) {
        updates.phone_number = phoneNumber || null;
      }
      if (address !== restaurant.address) {
        updates.address = address;
        // 좌표도 함께 업데이트
        if (coordinates) {
          updates.coordinates = coordinates;
        }
      }

      const newOpeningHours = openingHours.split("\n").filter(h => h.trim());
      const oldOpeningHours = restaurant.opening_hours || [];
      if (JSON.stringify(newOpeningHours) !== JSON.stringify(oldOpeningHours)) {
        updates.opening_hours = newOpeningHours.length > 0 ? newOpeningHours : null;
      }

      // 변경사항이 없으면 닫기
      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      // PATCH 요청 (카테고리 수정)
      if (updates.category) {
        const res = await fetch("/api/custom-restaurants", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            place_id: restaurant.place_id,
            category: updates.category,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "카테고리 수정에 실패했습니다.");
        }
      }

      // PUT 요청 (기타 정보 수정)
      const otherUpdates = { ...updates };
      delete otherUpdates.category;

      if (Object.keys(otherUpdates).length > 0) {
        const res = await fetch("/api/custom-restaurants", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            old_place_id: restaurant.place_id,
            ...otherUpdates,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "정보 수정에 실패했습니다.");
        }
      }

      onSuccess(updates as Partial<RestaurantData>);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div className="relative bg-background w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pb-3 flex items-center justify-between border-b">
          <h2 className="text-lg font-semibold">맛집 정보 수정</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 - 스크롤 가능 */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* 맛집명 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium mb-2">맛집명</label>
            <div className="px-3 py-2 bg-muted rounded-lg text-sm">
              {restaurant.name}
            </div>
          </div>

          {/* 주소 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                주소
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="주소 또는 좌표를 입력하세요"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                disabled={isConvertingAddress}
              />
              {isConvertingAddress && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              구글맵에서 복사한 좌표 (25.xxx, 121.xxx) 붙여넣기 시 자동 변환
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 카테고리 선택 */}
          <div>
            <label className="block text-sm font-medium mb-2">카테고리</label>
            <div className="grid grid-cols-2 gap-2">
              {availableCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-sm ${
                    category === cat.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                  </span>
                  {category === cat.id && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 특징/메모 */}
          <div>
            <label className="block text-sm font-medium mb-2">특징/메모</label>
            <textarea
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              placeholder="맛집 특징이나 메모를 입력하세요"
              className="w-full px-3 py-2 border border-border rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          {/* 전화번호 */}
          <div>
            <label className="block text-sm font-medium mb-2">전화번호</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="전화번호를 입력하세요"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          {/* 영업시간 */}
          <div>
            <label className="block text-sm font-medium mb-2">영업시간</label>
            <textarea
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="영업시간을 입력하세요 (줄바꿈으로 구분)"
              className="w-full px-3 py-2 border border-border rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              예: 월-금: 11:00-21:00 (줄바꿈으로 요일 구분)
            </p>
          </div>
        </div>

        {/* 버튼 - 하단 고정 */}
        <div className="flex gap-3 p-4 border-t bg-background flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12"
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            onClick={handleSaveClick}
            className="flex-1 h-12"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </div>

      {/* 확인 모달 */}
      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative bg-background w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">수정 확인</h3>
              <p className="text-sm text-muted-foreground mb-6">
                맛집 정보를 수정하시겠습니까?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  확인
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
