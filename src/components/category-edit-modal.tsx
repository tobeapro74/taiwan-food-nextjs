"use client";

import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/taiwan-food";

interface CategoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCategory: string;
  placeId: string;
  restaurantName: string;
  onSuccess: (newCategory: string) => void;
}

export function CategoryEditModal({
  isOpen,
  onClose,
  currentCategory,
  placeId,
  restaurantName,
  onSuccess,
}: CategoryEditModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // "전체" 카테고리 제외
  const availableCategories = categories.filter((cat) => cat.id !== "전체");

  const handleSubmit = async () => {
    if (selectedCategory === currentCategory) {
      onClose();
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/custom-restaurants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: placeId,
          category: selectedCategory,
        }),
      });

      const data = await res.json();

      if (data.success) {
        onSuccess(selectedCategory);
        onClose();
      } else {
        setError(data.error || "카테고리 수정에 실패했습니다.");
      }
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+80px)]">
      <div className="bg-background w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in max-h-[calc(100vh-120px-env(safe-area-inset-bottom))] flex flex-col">
        {/* 헤더 */}
        <div className="bg-primary px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-foreground">
            카테고리 수정
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 text-primary-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-medium text-foreground">{restaurantName}</span>의
            카테고리를 선택해주세요.
          </p>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 카테고리 목록 */}
          <div className="grid grid-cols-2 gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                  selectedCategory === cat.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{cat.icon}</span>
                  <span className="font-medium">{cat.name}</span>
                </span>
                {selectedCategory === cat.id && (
                  <Check className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-2">
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
              disabled={isLoading || selectedCategory === currentCategory}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "수정"
              )}
            </Button>
          </div>
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
