"use client";

import { useState, useRef } from "react";
import { X, Star, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  user: { id: number; name: string; profile_image?: string } | null;
  onSubmit: () => void;
}

const mealTypes = ["아침 식사", "브런치", "점심 식사", "저녁 식사", "기타"];

export function ReviewModal({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  user,
  onSubmit,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [atmosphereRating, setAtmosphereRating] = useState(0);
  const [content, setContent] = useState("");
  const [mealType, setMealType] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 파일을 Base64로 변환하는 함수
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 사진 업로드 처리
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        // 파일 크기 체크 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          alert("파일 크기는 10MB 이하여야 합니다.");
          continue;
        }

        // Base64로 변환
        const base64 = await fileToBase64(file);

        // Cloudinary 업로드 API 호출
        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        const result = await response.json();
        if (result.success && result.url) {
          setPhotos((prev) => [...prev, result.url]);
        } else {
          console.error("업로드 실패:", result.error);
          alert(result.error || "사진 업로드에 실패했습니다.");
        }
      }
    } catch (error) {
      console.error("사진 업로드 오류:", error);
      alert("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      // input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 사진 삭제
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (rating === 0) {
      alert("평점을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          rating,
          food_rating: foodRating || null,
          service_rating: serviceRating || null,
          atmosphere_rating: atmosphereRating || null,
          content,
          photos,
          meal_type: mealType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("리뷰가 등록되었습니다.");
        onSubmit();
        onClose();
        // 초기화
        setRating(0);
        setFoodRating(0);
        setServiceRating(0);
        setAtmosphereRating(0);
        setContent("");
        setPhotos([]);
        setMealType(null);
      } else {
        alert(result.error || "리뷰 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("리뷰 작성 오류:", error);
      alert("리뷰 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 별점 컴포넌트
  const StarRating = ({
    value,
    onChange,
    size = "lg",
  }: {
    value: number;
    onChange: (v: number) => void;
    size?: "sm" | "lg";
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={cn(
              size === "lg" ? "w-10 h-10" : "w-7 h-7",
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-background w-full max-w-lg rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up">
        {/* 헤더 */}
        <div className="flex-shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{restaurantName}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 사용자 정보 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div>
              <p className="font-medium">{user?.name || "게스트"}</p>
              <p className="text-xs text-muted-foreground">리뷰는 공개됩니다</p>
            </div>
          </div>

          {/* 전체 별점 */}
          <div className="flex justify-center py-2">
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {/* 세부 별점 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground">음식</span>
              <StarRating value={foodRating} onChange={setFoodRating} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">서비스</span>
              <StarRating value={serviceRating} onChange={setServiceRating} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">분위기</span>
              <StarRating value={atmosphereRating} onChange={setAtmosphereRating} size="sm" />
            </div>
          </div>

          {/* 리뷰 내용 */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="먼저 평점을 매긴 후 리뷰를 추가하세요."
            className="w-full h-28 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
          />

          {/* 사진 미리보기 */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <Image
                    src={photo}
                    alt={`리뷰 사진 ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-cover rounded-lg"
                    unoptimized
                  />
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 사진 추가 버튼 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-3 border-2 border-dashed border-primary/50 rounded-lg text-primary flex items-center justify-center gap-2 hover:bg-primary/5 disabled:opacity-50"
          >
            <ImagePlus className="w-5 h-5" />
            <span>{isUploading ? "업로드 중..." : "사진 추가"}</span>
          </button>

          {/* 식사 유형 */}
          <div className="space-y-3">
            <p className="text-foreground">어떤 식사를 하셨나요?</p>
            <div className="flex flex-wrap gap-2">
              {mealTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMealType(mealType === type ? null : type)}
                  className={cn(
                    "px-4 py-2 rounded-full border text-sm",
                    mealType === type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 게시 버튼 - 고정 */}
        <div className="flex-shrink-0 border-t p-4 safe-area-bottom">
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting || isUploading}
            className="w-full py-6 text-lg"
          >
            {isSubmitting ? "게시 중..." : "게시"}
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
