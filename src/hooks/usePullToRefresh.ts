"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshing) return;
      // 스크롤이 맨 위일 때만 활성화
      if (window.scrollY > 0) return;

      touchStartY.current = e.touches[0].clientY;
    },
    [enabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isRefreshing || touchStartY.current === null) return;
      if (window.scrollY > 0) {
        touchStartY.current = null;
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const deltaY = e.touches[0].clientY - touchStartY.current;

      if (deltaY > 10) {
        isPulling.current = true;
        e.preventDefault();
        // 저항감 있는 pull (점점 느려지는 느낌)
        const distance = Math.min(deltaY * 0.5, maxPull);
        setPullDistance(distance);
      }
    },
    [enabled, isRefreshing, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isPulling.current || touchStartY.current === null) {
      touchStartY.current = null;
      isPulling.current = false;
      return;
    }

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // 리프레시 중 작은 간격 유지
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    touchStartY.current = null;
    isPulling.current = false;
  }, [enabled, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing, containerRef };
}
