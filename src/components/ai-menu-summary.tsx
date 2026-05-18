"use client";

import { useState, useEffect } from "react";
import { Sparkles, UtensilsCrossed, MessageSquareQuote } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface AiMenuSummaryProps {
  restaurantName: string;
  reviewsReady?: boolean;
}

interface SummaryData {
  topMenus: string[];
  topReviews: string[];
  reviewCount: number;
}

export function AiMenuSummary({ restaurantName, reviewsReady = true }: AiMenuSummaryProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!reviewsReady) return;

    const fetchSummary = async () => {
      try {
        const res = await fetch(
          `/api/ai-menu-summary/${encodeURIComponent(restaurantName)}`
        );
        if (!res.ok) {
          setError(true);
          return;
        }
        const json = await res.json();
        if (json.error) {
          setError(true);
          return;
        }
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [restaurantName, reviewsReady]);

  if (loading) {
    return (
      <div className="space-y-3 mt-4 p-4 rounded-xl bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-purple-600">{t("ai_summary.analyzing")}</span>
        </div>
        <div className="h-8 w-full rounded-lg animate-pulse bg-muted" />
        <div className="h-16 w-full rounded-lg animate-pulse bg-muted" />
      </div>
    );
  }

  if (error || !data) return null;

  const hasMenus = data.topMenus.length > 0;
  const hasReviews = data.topReviews.length > 0;

  if (!hasMenus && !hasReviews) return null;

  return (
    <div className="space-y-4 mt-4 p-4 rounded-xl bg-muted/30">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-semibold text-purple-600">{t("ai_summary.title")}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {t("ai_summary.based_on_reviews", { count: data.reviewCount })}
        </span>
      </div>

      {hasMenus && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <UtensilsCrossed className="w-4 h-4 text-orange-500" />
            {t("ai_summary.top_menus")}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.topMenus.map((menu, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-orange-50 text-orange-700 text-sm rounded-full border border-orange-100 font-medium"
              >
                {menu}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasReviews && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <MessageSquareQuote className="w-4 h-4 text-blue-500" />
            {t("ai_summary.top_reviews")}
          </div>
          <div className="space-y-2">
            {data.topReviews.map((review, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-blue-50/60 rounded-lg px-3 py-2.5 border border-blue-100"
              >
                <span className="text-blue-400 text-base leading-none mt-0.5">&ldquo;</span>
                <p className="text-sm text-foreground/80 leading-relaxed">{review}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
