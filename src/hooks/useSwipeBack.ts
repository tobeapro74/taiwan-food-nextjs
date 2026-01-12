"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseSwipeBackOptions {
  onSwipeBack: () => void;
  enabled?: boolean;
  threshold?: number; // 스와이프 트리거 거리 (px)
  edgeWidth?: number; // 화면 왼쪽 가장자리 감지 영역 (px)
}

export function useSwipeBack({
  onSwipeBack,
  enabled = true,
  threshold = 100,
  edgeWidth = 30,
}: UseSwipeBackOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      // 화면 왼쪽 가장자리에서 시작한 경우에만 스와이프 감지
      if (touch.clientX <= edgeWidth) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        isSwiping.current = true;
      }
    },
    [enabled, edgeWidth]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isSwiping.current || touchStartX.current === null || touchStartY.current === null) {
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // 수평 스와이프가 수직 스와이프보다 크면 스크롤 방지
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
        e.preventDefault();
      }
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isSwiping.current || touchStartX.current === null || touchStartY.current === null) {
        touchStartX.current = null;
        touchStartY.current = null;
        isSwiping.current = false;
        return;
      }

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // 오른쪽으로 충분히 스와이프하고, 수평 이동이 수직보다 크면 뒤로가기
      if (deltaX > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        onSwipeBack();
      }

      touchStartX.current = null;
      touchStartY.current = null;
      isSwiping.current = false;
    },
    [enabled, threshold, onSwipeBack]
  );

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
}
