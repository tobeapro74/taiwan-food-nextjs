"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/taiwan-food";

interface RestaurantData {
  place_id: string;
  name: string;
  address: string;
  category: string;
  feature?: string;
  phone_number?: string;
  opening_hours?: string[];
  google_map_url?: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 모달이 열릴 때 초기값 설정
  useEffect(() => {
    if (isOpen) {
      setCategory(restaurant.category);
      setFeature(restaurant.feature || "");
      setPhoneNumber(restaurant.phone_number || "");
      setOpeningHours(restaurant.opening_hours?.join("\n") || "");
      setError("");
    }
  }, [isOpen, restaurant]);

  if (!isOpen) return null;

  // "전체" 카테고리 제외
  const availableCategories = categories.filter((cat) => cat.id !== "전체");

  const handleSubmit = async () => {
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-md rounded-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="bg-primary px-4 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-primary-foreground">
            맛집 정보 수정
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-primary-foreground"
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

          {/* 주소 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium mb-2">주소</label>
            <div className="px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
              {restaurant.address}
            </div>
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
            className="flex-1"
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
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

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
