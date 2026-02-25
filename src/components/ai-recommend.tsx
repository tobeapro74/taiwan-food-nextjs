"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RestaurantCard } from "@/components/restaurant-card";
import { Restaurant } from "@/data/taiwan-food";
import { useHaptic } from "@/hooks/useHaptic";
import { useLanguage } from "@/components/language-provider";
import { toast } from "sonner";

interface RecommendationResult {
  restaurant: Restaurant;
  reason: string;
  matchScore: number;
}

export interface RecommendState {
  query: string;
  results: RecommendationResult[];
  tip: string;
  hasSearched: boolean;
}

interface AIRecommendProps {
  onBack: () => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  timeSlot?: string;
  savedState?: RecommendState | null;
  onStateChange?: (state: RecommendState) => void;
}

export function AIRecommend({ onBack, onSelectRestaurant, timeSlot, savedState, onStateChange }: AIRecommendProps) {
  const { impact } = useHaptic();
  const { t, language } = useLanguage();
  const [query, setQuery] = useState(savedState?.query || "");
  const [loading, setLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [results, setResults] = useState<RecommendationResult[]>(savedState?.results || []);
  const [tip, setTip] = useState(savedState?.tip || "");
  const [hasSearched, setHasSearched] = useState(savedState?.hasSearched || false);
  const [searchMsgIndex, setSearchMsgIndex] = useState(0);

  const presets = [
    { label: t("ai.preset_spicy"), query: t("ai.query_spicy") },
    { label: t("ai.preset_value"), query: t("ai.query_value") },
    { label: t("ai.preset_date"), query: t("ai.query_date") },
    { label: t("ai.preset_solo"), query: t("ai.query_solo") },
    { label: t("ai.preset_night_market"), query: t("ai.query_night_market") },
    { label: t("ai.preset_dessert"), query: t("ai.query_dessert") },
    { label: t("ai.preset_local"), query: t("ai.query_local") },
    { label: t("ai.preset_noodle"), query: t("ai.query_noodle") },
  ];

  const PRESET_QUERY_SET = new Set(presets.map(p => p.query));

  const SEARCH_MESSAGES = [
    t("ai.loading_1"),
    t("ai.loading_2"),
    t("ai.loading_3"),
    t("ai.loading_4"),
  ];

  // 상태 변경 시 부모에 전달
  useEffect(() => {
    onStateChange?.({ query, results, tip, hasSearched });
  }, [query, results, tip, hasSearched, onStateChange]);

  // 검색 중 메시지 순환
  useEffect(() => {
    if (!showAIModal) return;
    setSearchMsgIndex(0);
    const interval = setInterval(() => {
      setSearchMsgIndex(prev => (prev + 1) % SEARCH_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAIModal]);

  const handleRecommend = async (q: string, isPreset: boolean = false) => {
    if (!q.trim()) return;
    impact();
    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setTip("");

    if (!isPreset) {
      setShowAIModal(true);
    }

    try {
      const res = await fetch("/api/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, timeSlot }),
      });
      const data = await res.json();

      if (data.success) {
        setResults(data.recommendations || []);
        setTip(data.tip || "");
        if (data.recommendations?.length === 0) {
          toast.error(t("ai.no_results").split("\n")[0]);
        }
      } else {
        toast.error(data.error || t("ai.recommend_failed"));
      }
    } catch {
      toast.error(t("ai.network_error"));
    } finally {
      setLoading(false);
      setShowAIModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* OpenAI 검색 중 풀스크린 모달 */}
      {showAIModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-card rounded-2xl p-8 mx-6 text-center shadow-premium animate-scale-in max-w-sm w-full">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <Sparkles className="w-6 h-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="font-bold text-lg mb-2">{t("ai.searching")}</h3>
            <p className="text-sm text-muted-foreground transition-opacity duration-300">
              {SEARCH_MESSAGES[searchMsgIndex]}
            </p>
            <div className="flex justify-center gap-1 mt-4">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  style={{
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                    opacity: 0.3,
                  }}
                />
              ))}
            </div>
            <style jsx>{`
              @keyframes pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.3); }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="sticky top-0 z-[80] bg-card border-b border-border safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-1 -ml-1 text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5" />
            <h1 className="font-bold text-lg">{t("ai.title")}</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 프리셋 칩 */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">{t("ai.question")}</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setQuery(preset.query);
                  handleRecommend(preset.query, true);
                }}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 자유 입력 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const isPreset = PRESET_QUERY_SET.has(query);
                handleRecommend(query, isPreset);
              }
            }}
            placeholder={t("ai.input_placeholder")}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => {
              const isPreset = PRESET_QUERY_SET.has(query);
              handleRecommend(query, isPreset);
            }}
            disabled={loading || !query.trim()}
            className="rounded-xl w-10 h-10 bg-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* 프리셋 로딩 (인라인 스켈레톤) */}
        {loading && !showAIModal && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-28 h-28 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
            <p className="text-center text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 inline-block mr-1 animate-spin" />
              {t("ai.loading_results")}
            </p>
          </div>
        )}

        {/* 결과 */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {tip && (
              <div className="bg-muted/50 dark:bg-muted border border-border rounded-xl p-3">
                <p className="text-sm text-foreground">
                  <Sparkles className="w-3.5 h-3.5 inline-block mr-1" />
                  {tip}
                </p>
              </div>
            )}
            {results.map((result, index) => (
              <div key={result.restaurant.이름} className="space-y-1">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-semibold text-primary">#{index + 1}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{result.reason}</span>
                </div>
                <RestaurantCard
                  restaurant={result.restaurant}
                  onClick={() => onSelectRestaurant(result.restaurant)}
                  onViewDetail={() => onSelectRestaurant(result.restaurant)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && hasSearched && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🤔</p>
            <p className="text-muted-foreground text-sm whitespace-pre-line">
              {t("ai.no_results")}
            </p>
          </div>
        )}

        {/* 초기 상태 */}
        {!loading && !hasSearched && (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🤖</p>
            <h2 className="font-bold text-lg mb-2">{t("ai.subtitle")}</h2>
            <p className="text-muted-foreground text-sm whitespace-pre-line">
              {t("ai.guide")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
