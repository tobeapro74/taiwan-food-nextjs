"use client";

import { useEffect, useState } from "react";
import { Star, MapPin, X } from "lucide-react";
import { Restaurant, getUnsplashImage } from "@/data/taiwan-food";
import Image from "next/image";

// 이미지 캐시 공유 (restaurant-card와 동일)
const imageCache: Record<string, string> = {};

interface PeekPreviewProps {
  restaurant: Restaurant;
  onClose: () => void;
  onViewDetail: () => void;
}

export function PeekPreview({ restaurant, onClose, onViewDetail }: PeekPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string>(imageCache[restaurant.이름] || "");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 애니메이션 트리거
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (imageCache[restaurant.이름]) {
      setImageUrl(imageCache[restaurant.이름]);
      return;
    }
    const fallback = getUnsplashImage(restaurant.이름);
    const fetchImage = async () => {
      try {
        const query = `${restaurant.이름} ${restaurant.위치 || ""}`.trim();
        const res = await fetch(`/api/place-photo?query=${encodeURIComponent(query)}&name=${encodeURIComponent(restaurant.이름)}`);
        const data = await res.json();
        if (data.photoUrl) {
          imageCache[restaurant.이름] = data.photoUrl;
          setImageUrl(data.photoUrl);
        } else {
          imageCache[restaurant.이름] = fallback;
          setImageUrl(fallback);
        }
      } catch {
        imageCache[restaurant.이름] = fallback;
        setImageUrl(fallback);
      }
    };
    fetchImage();
  }, [restaurant.이름, restaurant.위치]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-center justify-center p-6 transition-all duration-200 ${
        visible ? "bg-black/50 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={handleClose}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`w-full max-w-sm glass-sheet rounded-3xl overflow-hidden shadow-2xl transition-all duration-200 ${
          visible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        }`}
        style={{ WebkitTouchCallout: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 이미지 */}
        <div className="h-48 relative overflow-hidden bg-muted">
          {!imageLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted" />
          )}
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={restaurant.이름}
              fill
              className={`object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              sizes="350px"
              unoptimized
              onLoad={() => setImageLoaded(true)}
            />
          )}
          {/* 그래디언트 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-white font-bold text-lg drop-shadow-md">{restaurant.이름}</h3>
          </div>
        </div>

        {/* 정보 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {restaurant.평점 && (
              <span className="flex items-center gap-1 text-sm">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="font-semibold">{restaurant.평점}</span>
              </span>
            )}
            {restaurant.리뷰수 && (
              <span className="text-xs text-muted-foreground">
                리뷰 {restaurant.리뷰수 >= 1000 ? `${(restaurant.리뷰수 / 1000).toFixed(1)}K` : restaurant.리뷰수}
              </span>
            )}
            {restaurant.가격대 && (
              <span className="text-xs text-muted-foreground">{restaurant.가격대}</span>
            )}
          </div>

          {restaurant.위치 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{restaurant.위치}</span>
            </div>
          )}

          <p className="text-sm text-muted-foreground line-clamp-2">{restaurant.특징}</p>

          {/* 상세보기 버튼 */}
          <button
            onClick={() => {
              handleClose();
              setTimeout(onViewDetail, 220);
            }}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-medium text-sm transition-all active:scale-[0.98] hover:bg-primary/90"
          >
            상세보기
          </button>
        </div>
      </div>
    </div>
  );
}
