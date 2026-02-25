"use client";

import { useState, useEffect } from "react";
import { Star, User, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/components/language-provider";

interface GoogleReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface GoogleReviewsProps {
  restaurantName: string;
}

// 리뷰 캐시
const getReviewCache = (): Record<string, { reviews: GoogleReview[]; rating: number | null; userRatingsTotal: number | null }> => {
  if (typeof window !== "undefined") {
    if (!(window as unknown as { __googleReviewCache?: Record<string, { reviews: GoogleReview[]; rating: number | null; userRatingsTotal: number | null }> }).__googleReviewCache) {
      (window as unknown as { __googleReviewCache: Record<string, { reviews: GoogleReview[]; rating: number | null; userRatingsTotal: number | null }> }).__googleReviewCache = {};
    }
    return (window as unknown as { __googleReviewCache: Record<string, { reviews: GoogleReview[]; rating: number | null; userRatingsTotal: number | null }> }).__googleReviewCache;
  }
  return {};
};

export function GoogleReviews({ restaurantName }: GoogleReviewsProps) {
  const { t } = useLanguage();
  const cache = getReviewCache();
  const [reviews, setReviews] = useState<GoogleReview[]>(cache[restaurantName]?.reviews || []);
  const [rating, setRating] = useState<number | null>(cache[restaurantName]?.rating ?? null);
  const [userRatingsTotal, setUserRatingsTotal] = useState<number | null>(cache[restaurantName]?.userRatingsTotal ?? null);
  const [isLoading, setIsLoading] = useState(!cache[restaurantName]);
  const [expandedReviews, setExpandedReviews] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (cache[restaurantName]) {
      setReviews(cache[restaurantName].reviews);
      setRating(cache[restaurantName].rating);
      setUserRatingsTotal(cache[restaurantName].userRatingsTotal);
      setIsLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/google-reviews/${encodeURIComponent(restaurantName)}`);
        const data = await res.json();

        cache[restaurantName] = {
          reviews: data.reviews || [],
          rating: data.rating,
          userRatingsTotal: data.userRatingsTotal
        };

        setReviews(data.reviews || []);
        setRating(data.rating);
        setUserRatingsTotal(data.userRatingsTotal);
      } catch (error) {
        console.error("Error fetching Google reviews:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, [restaurantName, cache]);

  const toggleExpand = (index: number) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-accent text-accent"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded animate-shimmer" />
          <h3 className="font-semibold">{t("review.google_reviews")}</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-border/40">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full animate-shimmer" />
                <div className="space-y-2">
                  <div className="w-24 h-4 animate-shimmer rounded" />
                  <div className="w-16 h-3 animate-shimmer rounded" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="w-full h-4 animate-shimmer rounded" />
                <div className="w-3/4 h-4 animate-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <h3 className="font-semibold">{t("review.google_reviews")}</h3>
        </div>
        {rating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
            {userRatingsTotal && (
              <span>({t("restaurant.reviews_count", { count: userRatingsTotal.toLocaleString() })})</span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {reviews.map((review, index) => {
          const isExpanded = expandedReviews.has(index);
          const shouldTruncate = review.text.length > 150;
          const displayText = shouldTruncate && !isExpanded
            ? review.text.slice(0, 150) + "..."
            : review.text;

          return (
            <div
              key={`${review.author_name}-${review.time}`}
              className="p-4 rounded-lg bg-muted/30 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {review.profile_photo_url ? (
                    <Image
                      src={review.profile_photo_url}
                      alt={review.author_name}
                      width={40}
                      height={40}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{review.author_name}</span>
                      {review.author_url && (
                        <a
                          href={review.author_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {renderStars(review.rating)}
                      <span className="text-xs text-muted-foreground">
                        {review.relative_time_description}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {review.text && (
                <div className="text-sm text-muted-foreground">
                  <p className="whitespace-pre-wrap">{displayText}</p>
                  {shouldTruncate && (
                    <button
                      onClick={() => toggleExpand(index)}
                      className="text-primary hover:underline text-xs mt-1"
                    >
                      {isExpanded ? t("common.fold") : t("common.more")}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
