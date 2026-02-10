"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RestaurantCard } from "@/components/restaurant-card";
import { Restaurant } from "@/data/taiwan-food";
import { useHaptic } from "@/hooks/useHaptic";
import { toast } from "sonner";

interface RecommendationResult {
  restaurant: Restaurant;
  reason: string;
  matchScore: number;
}

interface AIRecommendProps {
  onBack: () => void;
  onSelectRestaurant: (restaurant: Restaurant) => void;
  timeSlot?: string;
}

const presets = [
  { label: "매운 음식 🌶️", query: "매운 음식이 먹고 싶어요" },
  { label: "가성비 👍", query: "가격 대비 양이 많은 가성비 좋은 맛집" },
  { label: "데이트 💕", query: "분위기 좋은 데이트 맛집" },
  { label: "혼밥 🍜", query: "혼자서 편하게 먹을 수 있는 맛집" },
  { label: "야시장 🌃", query: "야시장에서 꼭 먹어봐야 할 음식" },
  { label: "디저트 🍧", query: "달콤한 디저트와 음료" },
  { label: "현지 로컬 🏠", query: "관광객보다 현지인이 더 많이 가는 로컬 맛집" },
  { label: "면 요리 🍝", query: "맛있는 면 요리 전문점" },
];

// 프리셋 쿼리 Set (프리셋 여부 판별용)
const PRESET_QUERY_SET = new Set(presets.map(p => p.query));

// AI 검색 중 모달 메시지 (순환)
const SEARCH_MESSAGES = [
  "AI가 맛집을 분석하고 있습니다...",
  "대만 현지 맛집을 탐색 중...",
  "최적의 맛집을 선별하고 있습니다...",
  "거의 다 됐습니다...",
];

export function AIRecommend({ onBack, onSelectRestaurant, timeSlot }: AIRecommendProps) {
  const { impact } = useHaptic();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false); // OpenAI 검색 중 모달
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [tip, setTip] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMsgIndex, setSearchMsgIndex] = useState(0);

  // 검색 중 메시지 순환
  useEffect(() => {
    if (!showAIModal) return;
    setSearchMsgIndex(0);
    const interval = setInterval(() => {
      setSearchMsgIndex(prev => (prev + 1) % SEARCH_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [showAIModal]);

  const handleRecommend = async (q: string, isPreset: boolean = false) => {
    if (!q.trim()) return;
    impact();
    setLoading(true);
    setHasSearched(true);
    setResults([]);
    setTip("");

    // 자유 입력(OpenAI 호출)일 때만 풀스크린 모달 표시
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
          toast.error("조건에 맞는 맛집을 찾지 못했습니다.");
        }
      } else {
        toast.error(data.error || "추천에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
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
            <h3 className="font-bold text-lg mb-2">AI 맛집 검색 중</h3>
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
      <div className="sticky top-0 z-[80] bg-foreground dark:bg-card text-white safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <h1 className="font-bold text-lg">AI 맛집 추천</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 프리셋 칩 */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">어떤 맛집을 찾으시나요?</p>
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
            placeholder="원하는 음식이나 분위기를 입력하세요..."
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
              맛집을 불러오고 있습니다...
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
            <p className="text-muted-foreground text-sm">
              조건에 맞는 맛집을 찾지 못했습니다.<br />
              다른 키워드로 다시 시도해보세요.
            </p>
          </div>
        )}

        {/* 초기 상태 */}
        {!loading && !hasSearched && (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🤖</p>
            <h2 className="font-bold text-lg mb-2">AI가 맛집을 추천해드려요</h2>
            <p className="text-muted-foreground text-sm">
              위 태그를 선택하거나<br />
              원하는 음식, 분위기를 자유롭게 입력하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
