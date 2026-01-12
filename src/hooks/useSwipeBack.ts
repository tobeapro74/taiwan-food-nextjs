"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseSwipeBackOptions {
  onSwipeBack: () => void;
  enabled?: boolean;
  threshold?: number; // 스와이프 트리거 거리 (px)
  edgeWidth?: number; // 화면 왼쪽 가장자리 감지 영역 (px)
}

// 스와이프 인디케이터 컴포넌트 생성/업데이트
function updateSwipeIndicator(progress: number, show: boolean) {
  let indicator = document.getElementById("swipe-back-indicator");

  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "swipe-back-indicator";
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.15s ease-out;
    `;

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(to right, rgba(0,0,0,0.1) 0%, transparent 30%);
    `;

    const arrow = document.createElement("div");
    arrow.id = "swipe-back-arrow";
    arrow.style.cssText = `
      position: absolute;
      top: 50%;
      left: 10px;
      transform: translateY(-50%) translateX(-20px);
      width: 40px;
      height: 40px;
      background: rgba(0,0,0,0.5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease-out, opacity 0.15s ease-out;
      opacity: 0;
    `;
    arrow.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`;

    indicator.appendChild(overlay);
    indicator.appendChild(arrow);
    document.body.appendChild(indicator);
  }

  const arrow = document.getElementById("swipe-back-arrow");

  if (show && progress > 0) {
    indicator.style.opacity = "1";
    if (arrow) {
      const translateX = Math.min(progress * 0.5, 30);
      arrow.style.transform = `translateY(-50%) translateX(${translateX}px)`;
      arrow.style.opacity = String(Math.min(progress / 50, 1));
    }
  } else {
    indicator.style.opacity = "0";
    if (arrow) {
      arrow.style.transform = "translateY(-50%) translateX(-20px)";
      arrow.style.opacity = "0";
    }
  }
}

// 페이지 슬라이드 효과
function slidePageContent(progress: number, show: boolean) {
  const mainContent = document.querySelector("main") || document.body.firstElementChild;
  if (mainContent && mainContent instanceof HTMLElement) {
    if (show && progress > 0) {
      const translateX = Math.min(progress * 0.3, 50);
      mainContent.style.transform = `translateX(${translateX}px)`;
      mainContent.style.transition = "none";
    } else {
      mainContent.style.transform = "";
      mainContent.style.transition = "transform 0.2s ease-out";
    }
  }
}

export function useSwipeBack({
  onSwipeBack,
  enabled = true,
  threshold = 100,
  edgeWidth = 30,
}: UseSwipeBackOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const currentX = useRef<number>(0);
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      // 화면 왼쪽 가장자리에서 시작한 경우에만 스와이프 감지
      if (touch.clientX <= edgeWidth) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        currentX.current = 0;
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

      // 수평 스와이프가 수직 스와이프보다 크면 스크롤 방지 및 시각 효과
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
        e.preventDefault();
        currentX.current = deltaX;
        updateSwipeIndicator(deltaX, true);
        slidePageContent(deltaX, true);
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

      // 시각 효과 제거
      updateSwipeIndicator(0, false);
      slidePageContent(0, false);

      // 오른쪽으로 충분히 스와이프하고, 수평 이동이 수직보다 크면 뒤로가기
      if (deltaX > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        onSwipeBack();
      }

      touchStartX.current = null;
      touchStartY.current = null;
      currentX.current = 0;
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
      // 클린업 시 인디케이터 제거
      const indicator = document.getElementById("swipe-back-indicator");
      if (indicator) {
        indicator.remove();
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
