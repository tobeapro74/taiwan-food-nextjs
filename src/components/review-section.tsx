"use client";

import { useState, useEffect } from "react";
import { Star, Plus, User, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewModal } from "@/components/review-modal";
import { AuthModal } from "@/components/auth-modal";
import { cn } from "@/lib/utils";

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

interface User {
  id: number;
  name: string;
  profile_image?: string;
  is_admin: boolean;
}

interface ReviewSectionProps {
  restaurantId: string;
  restaurantName: string;
}

export function ReviewSection({ restaurantId, restaurantName }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        }
      } catch (error) {
        console.error("사용자 정보 조회 오류:", error);
      }
    };
    fetchUser();
  }, []);

  // 리뷰 목록 가져오기
  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reviews?restaurantId=${restaurantId}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.data);
      }
    } catch (error) {
      console.error("리뷰 조회 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [restaurantId]);

  // 평균 별점 계산
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 리뷰 수정
  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setIsModalOpen(true);
  };

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm("리뷰를 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReview(null);
  };

  // 별점 표시
  const StarDisplay = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            size === "sm" ? "w-4 h-4" : "w-5 h-5",
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          )}
        />
      ))}
    </div>
  );

  return (
    <div className="mt-4">
      <Card className="border-0">
        <CardContent className="p-5">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">리뷰</h3>
              <div className="flex items-center gap-2 mt-1">
                <StarDisplay rating={Math.round(parseFloat(averageRating))} size="md" />
                <span className="font-semibold">{averageRating}</span>
                <span className="text-muted-foreground">({reviews.length}개)</span>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!user) {
                  setIsAuthModalOpen(true);
                  return;
                }
                setIsModalOpen(true);
              }}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              게시
            </Button>
          </div>

          {/* 리뷰 목록 */}
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              리뷰를 불러오는 중...
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border pb-4 last:border-0">
                  {/* 작성자 정보 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {review.member_profile_image ? (
                          <img
                            src={review.member_profile_image}
                            alt={review.member_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{review.member_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>
                    {/* 수정/삭제 버튼 (본인 또는 관리자만) */}
                    {user && (user.id === review.member_id || user.is_admin) && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleEditReview(review)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* 별점 */}
                  <div className="flex items-center gap-2 mb-2">
                    <StarDisplay rating={review.rating} />
                    {review.meal_type && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {review.meal_type}
                      </span>
                    )}
                  </div>

                  {/* 세부 별점 */}
                  {(review.food_rating || review.service_rating || review.atmosphere_rating) && (
                    <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                      {review.food_rating && <span>음식 {review.food_rating}</span>}
                      {review.service_rating && <span>서비스 {review.service_rating}</span>}
                      {review.atmosphere_rating && <span>분위기 {review.atmosphere_rating}</span>}
                    </div>
                  )}

                  {/* 내용 */}
                  {review.content && (
                    <p className="text-sm text-foreground">{review.content}</p>
                  )}

                  {/* 사진 */}
                  {review.photos && review.photos.length > 0 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto">
                      {review.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`리뷰 사진 ${idx + 1}`}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 리뷰 작성/수정 모달 */}
      <ReviewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        user={user}
        onSubmit={() => {
          fetchReviews();
          setEditingReview(null);
        }}
        editReview={editingReview}
      />

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(userData) => {
          setUser(userData);
          setIsAuthModalOpen(false);
          setIsModalOpen(true); // 로그인 성공 후 리뷰 작성 모달 열기
        }}
      />
    </div>
  );
}
