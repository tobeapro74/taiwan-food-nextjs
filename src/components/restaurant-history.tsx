"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, ExternalLink, Info } from "lucide-react";
import { RestaurantHistory } from "@/lib/types";
import { categories as foodCategories } from "@/data/taiwan-food";
import { useLanguage } from "@/components/language-provider";

interface RestaurantHistoryListProps {
  onBack: () => void;
  onSelectRestaurant?: (placeId: string) => void;
}

export function RestaurantHistoryList({ onBack, onSelectRestaurant }: RestaurantHistoryListProps) {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<RestaurantHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/restaurant-history?page=${page}&limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("히스토리 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).replace(/\. /g, ".").replace(/\.$/, "");
  };

  const getCategoryLabel = (categoryId: string) => {
    const cat = foodCategories.find(c => c.id === categoryId);
    return cat ? t(cat.nameKey) : categoryId;
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "register":
        return <Badge className="bg-primary text-primary-foreground text-xs">{t("history.registered")}</Badge>;
      case "delete":
        return <Badge className="bg-destructive text-white text-xs">{t("history.deleted")}</Badge>;
      case "update":
        return <Badge className="bg-muted-foreground text-white text-xs">{t("history.modified")}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{action}</Badge>;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm safe-area-top">
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="ghost"
            onClick={onBack}
            className="h-11 w-11 min-w-[44px] min-h-[44px] rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">{t("history.title")}</h1>
          <span className="text-sm text-muted-foreground ml-auto">
            {t("history.total", { count: total })}
          </span>
        </div>
      </div>

      {/* 테이블 헤더 - 데스크탑에서만 표시 */}
      <div className="sticky top-[60px] z-10 bg-muted/50 border-b border-border hidden md:block overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
          <div className="col-span-1 text-center overflow-hidden">#</div>
          <div className="col-span-2 overflow-hidden">{t("history.date")}</div>
          <div className="col-span-3 overflow-hidden">{t("history.name")}</div>
          <div className="col-span-3 overflow-hidden">{t("history.area")}</div>
          <div className="col-span-2 overflow-hidden">{t("history.category")}</div>
          <div className="col-span-1 text-center overflow-hidden">{t("history.status")}</div>
        </div>
      </div>

      {/* 로딩 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 히스토리 목록 */}
          <div className="divide-y divide-border">
            {history.length > 0 ? (
              history.map((item) => (
                <div
                  key={item._id || item.seq}
                  className="px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* 모바일 레이아웃 (카드 형식) */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">#{item.seq}</span>
                          {getActionBadge(item.action)}
                          <Badge variant="outline" className="text-xs">
                            {getCategoryLabel(item.category)}
                          </Badge>
                        </div>
                        {item.action !== "delete" ? (
                          <button
                            onClick={() => onSelectRestaurant?.(item.place_id)}
                            className="text-sm font-medium text-primary hover:underline flex items-center gap-1 active:scale-95 transition-transform duration-150"
                            title={`${item.name} - ${t("restaurant.view_detail")}`}
                          >
                            <span className="truncate">{item.name}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground line-through truncate block">
                            {item.name}
                          </span>
                        )}
                        {item.short_address && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {item.short_address}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.registered_at)}
                      </span>
                    </div>
                    {item.memo && (
                      <div className="mt-2 flex items-start gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{item.memo}</span>
                      </div>
                    )}
                  </div>

                  {/* 데스크탑 레이아웃 (테이블 형식) */}
                  <div className="hidden md:block overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-1 text-center text-sm font-medium text-muted-foreground overflow-hidden">
                        {item.seq}
                      </div>
                      <div className="col-span-2 text-xs text-muted-foreground overflow-hidden whitespace-nowrap">
                        {formatDate(item.registered_at)}
                      </div>
                      <div className="col-span-3 min-w-0 overflow-hidden">
                        {item.action !== "delete" ? (
                          <button
                            onClick={() => onSelectRestaurant?.(item.place_id)}
                            className="text-sm font-medium text-primary hover:underline flex items-center gap-1 max-w-full overflow-hidden active:scale-95 transition-transform duration-150"
                            title={`${item.name} - ${t("restaurant.view_detail")}`}
                          >
                            <span className="truncate">{item.name}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground line-through truncate block" title={item.name}>
                            {item.name}
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 text-xs text-muted-foreground truncate overflow-hidden" title={item.short_address}>
                        {item.short_address || "-"}
                      </div>
                      <div className="col-span-2 overflow-hidden">
                        <Badge variant="outline" className="text-xs truncate max-w-full">
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </div>
                      <div className="col-span-1 flex justify-center overflow-hidden">
                        {getActionBadge(item.action)}
                      </div>
                    </div>
                    {item.memo && (
                      <div className="mt-1 ml-[calc(8.33%+0.5rem)] flex items-start gap-1 text-xs text-muted-foreground">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{item.memo}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-12">
                {t("history.no_entries")}
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
