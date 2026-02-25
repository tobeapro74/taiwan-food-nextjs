"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { X, Star, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useLanguage } from "@/components/language-provider";

interface Review {
  id: number;
  restaurant_id: string;
  member_id: number;
  member_name: string;
  member_profile_image?: string;
  rating: number;
  food_rating?: number;
  service_rating?: number;
  atmosphere_rating?: number;
  content: string;
  photos?: string[];
  meal_type?: string;
  created_at: string;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  user: { id: number; name: string; profile_image?: string } | null;
  onSubmit: () => void;
  editReview?: Review | null;
}

const MAX_PHOTOS = 4;
const MAX_IMAGE_SIZE = 800; // 최대 이미지 크기 (px) - Vercel 요청 크기 제한 고려
const IMAGE_QUALITY = 0.6; // JPEG 품질 (0.6 = 60%)

export function ReviewModal({
  isOpen,
  onClose,
  restaurantId,
  restaurantName,
  user,
  onSubmit,
  editReview,
}: ReviewModalProps) {
  const { t } = useLanguage();

  // mealType display mapping: DB stores Korean values, display uses i18n
  const mealTypeMap: { value: string; key: string }[] = [
    { value: "아침 식사", key: "review.meal_breakfast" },
    { value: "브런치", key: "review.meal_brunch" },
    { value: "점심 식사", key: "review.meal_lunch" },
    { value: "저녁 식사", key: "review.meal_dinner" },
    { value: "기타", key: "review.meal_other" },
  ];

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

  const isEditMode = !!editReview;

  // 수정 모드일 때 기존 데이터로 폼 초기화 및 배경 스크롤 방지
  useEffect(() => {
    if (isOpen && editReview) {
      setRating(editReview.rating);
      setFoodRating(editReview.food_rating || 0);
      setServiceRating(editReview.service_rating || 0);
      setAtmosphereRating(editReview.atmosphere_rating || 0);
      setContent(editReview.content || "");
      setPhotos(editReview.photos || []);
      setMealType(editReview.meal_type || null);
    } else if (isOpen && !editReview) {
      // 새 리뷰 작성 시 폼 초기화
      setRating(0);
      setFoodRating(0);
      setServiceRating(0);
      setAtmosphereRating(0);
      setContent("");
      setPhotos([]);
      setMealType(null);
    }
    // 배경 스크롤 방지
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, editReview]);

  if (!isOpen) return null;

  // 이미지 리사이즈 함수
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // URL.createObjectURL 사용 (메모리 효율적)
      const objectUrl = URL.createObjectURL(file);
      const img = document.createElement("img");

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // 비율 유지하면서 리사이즈
          if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
            if (width > height) {
              height = Math.round((height / width) * MAX_IMAGE_SIZE);
              width = MAX_IMAGE_SIZE;
            } else {
              width = Math.round((width / height) * MAX_IMAGE_SIZE);
              height = MAX_IMAGE_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Canvas context를 생성할 수 없습니다."));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // JPEG로 변환
          const resizedBase64 = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);

          // 메모리 정리
          URL.revokeObjectURL(objectUrl);

          resolve(resizedBase64);
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("이미지를 로드할 수 없습니다."));
      };

      img.src = objectUrl;
    });
  };

  // 사진 업로드 처리
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 4개 제한 체크
    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      toast.warning(t("review.photo_max", { max: MAX_PHOTOS }));
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.warning(t("review.photo_limit", { count: remainingSlots, max: MAX_PHOTOS }));
    }

    setIsUploading(true);

    try {
      for (const file of filesToUpload) {
        // 이미지 파일 체크
        if (!file.type.startsWith("image/")) {
          toast.warning(t("review.image_only"));
          continue;
        }

        try {
          // 리사이즈 후 Base64 변환
          const resizedBase64 = await resizeImage(file);

          // Cloudinary 업로드 API 호출
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: resizedBase64 }),
          });

          const result = await response.json();
          if (result.success && result.url) {
            setPhotos((prev) => [...prev, result.url]);
          } else {
            console.error("업로드 실패:", result.error);
            toast.error(result.error || t("review.upload_failed"));
          }
        } catch (fileError) {
          console.error("파일 처리 오류:", fileError);
          const errorMsg = fileError instanceof Error ? fileError.message : "파일 처리 중 오류";
          toast.error(`사진 처리에 실패했습니다: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error("사진 업로드 오류:", error);
      const errorMsg = error instanceof Error ? error.message : "알 수 없는 오류";
      toast.error(`사진 업로드에 실패했습니다: ${errorMsg}`);
    } finally {
      setIsUploading(false);
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
      toast.warning(t("review.login_required"));
      return;
    }

    if (rating === 0) {
      toast.warning(t("review.rating_required"));
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEditMode ? `/api/reviews/${editReview.id}` : "/api/reviews";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
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
        toast.success(isEditMode ? t("review.edit_success") : t("review.submit_success"));
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
        toast.error(result.error || (isEditMode ? t("review.edit_failed") : t("review.submit_failed")));
      }
    } catch (error) {
      console.error("리뷰 작성 오류:", error);
      toast.error(isEditMode ? t("review.edit_failed") : t("review.submit_failed"));
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
                ? "fill-accent text-accent"
                : "text-muted-foreground/50"
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div className="relative bg-background w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pb-3 flex items-center justify-between border-b">
          <h2 className="text-lg font-semibold">{isEditMode ? t("review.edit_title") : restaurantName}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 스크롤 가능한 컨텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 사용자 정보 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div>
              <p className="font-medium">{user?.name || t("common.guest")}</p>
              <p className="text-xs text-muted-foreground">{t("review.public_notice")}</p>
            </div>
          </div>

          {/* 전체 별점 */}
          <div className="flex justify-center py-2">
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {/* 세부 별점 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground">{t("review.food")}</span>
              <StarRating value={foodRating} onChange={setFoodRating} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">{t("review.service")}</span>
              <StarRating value={serviceRating} onChange={setServiceRating} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-foreground">{t("review.atmosphere")}</span>
              <StarRating value={atmosphereRating} onChange={setAtmosphereRating} size="sm" />
            </div>
          </div>

          {/* 리뷰 내용 */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("review.placeholder")}
            className="w-full h-28 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
          />

          {/* 사진 미리보기 */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <Image
                    src={photo}
                    alt={t("review.photo_alt", { index: index + 1 })}
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
            disabled={isUploading || photos.length >= MAX_PHOTOS}
            className="w-full py-3 border-2 border-dashed border-primary/50 rounded-lg text-primary flex items-center justify-center gap-2 hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImagePlus className="w-5 h-5" />
            <span>
              {isUploading
                ? t("review.uploading")
                : photos.length >= MAX_PHOTOS
                ? t("review.photos_added", { max: MAX_PHOTOS })
                : t("review.photo_count", { current: photos.length, max: MAX_PHOTOS })}
            </span>
          </button>

          {/* 식사 유형 */}
          <div className="space-y-3">
            <p className="text-foreground">{t("review.meal_question")}</p>
            <div className="flex flex-wrap gap-2">
              {mealTypeMap.map((meal) => (
                <button
                  key={meal.value}
                  type="button"
                  onClick={() => setMealType(mealType === meal.value ? null : meal.value)}
                  className={cn(
                    "px-4 py-2 rounded-full border text-sm",
                    mealType === meal.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  )}
                >
                  {t(meal.key)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 게시 버튼 - 고정 */}
        <div className="flex-shrink-0 border-t p-4 bg-background">
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting || isUploading}
            className="w-full h-12 text-base"
          >
            {isSubmitting ? (isEditMode ? t("review.updating") : t("review.submitting")) : (isEditMode ? t("review.update") : t("review.submit"))}
          </Button>
        </div>
      </div>

    </div>
  );
}
