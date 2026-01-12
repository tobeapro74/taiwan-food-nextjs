"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseSwipeBackOptions {
  onSwipeBack: () => void;
  enabled?: boolean;
  threshold?: number; // 스와이프 트리거 거리 (px)
  edgeWidth?: number; // 화면 왼쪽 가장자리 감지 영역 (px)
}

// iOS 스타일 스와이프 뒤로가기 오버레이 생성
function createSwipeOverlay() {
  let overlay = document.getElementById("swipe-back-overlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "swipe-back-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9998;
      background: rgba(0, 0, 0, 0);
      transition: background 0.3s ease-out;
    `;
    document.body.appendChild(overlay);
  }

  return overlay;
}

// 페이지 슬라이드 효과 (iOS 스타일)
function slidePageContent(progress: number, show: boolean, screenWidth: number) {
  // 현재 페이지 컨텐츠 찾기
  const pageContent = document.querySelector(".min-h-screen") as HTMLElement;
  const overlay = createSwipeOverlay();

  if (pageContent) {
    if (show && progress > 0) {
      // 스와이프 양에 비례해서 페이지 이동 (최대 화면 너비만큼)
      const translateX = Math.min(progress, screenWidth);
      const percentage = translateX / screenWidth;

      // 현재 페이지는 오른쪽으로 이동
      pageContent.style.transform = `translateX(${translateX}px)`;
      pageContent.style.transition = "none";
      pageContent.style.boxShadow = `-5px 0 25px rgba(0, 0, 0, ${0.15 * (1 - percentage)})`;

      // 배경 어두워지는 효과 (역방향 - 스와이프할수록 밝아짐)
      overlay.style.background = `rgba(0, 0, 0, ${0.3 * (1 - percentage)})`;
    } else {
      pageContent.style.transform = "";
      pageContent.style.transition = "transform 0.3s ease-out, box-shadow 0.3s ease-out";
      pageContent.style.boxShadow = "";
      overlay.style.background = "rgba(0, 0, 0, 0)";
    }
  }
}

// 스와이프 완료 시 페이지 밀어내기 애니메이션
function animatePageOut(screenWidth: number, onComplete: () => void) {
  const pageContent = document.querySelector(".min-h-screen") as HTMLElement;
  const overlay = document.getElementById("swipe-back-overlay");

  if (pageContent) {
    pageContent.style.transition = "transform 0.25s ease-out, box-shadow 0.25s ease-out";
    pageContent.style.transform = `translateX(${screenWidth}px)`;
    pageContent.style.boxShadow = "none";

    if (overlay) {
      overlay.style.transition = "background 0.25s ease-out";
      overlay.style.background = "rgba(0, 0, 0, 0)";
    }

    setTimeout(() => {
      pageContent.style.transform = "";
      pageContent.style.transition = "";
      pageContent.style.boxShadow = "";
      onComplete();
    }, 250);
  } else {
    onComplete();
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
  const isAnimating = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || isAnimating.current) return;

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
      if (!enabled || !isSwiping.current || touchStartX.current === null || touchStartY.current === null || isAnimating.current) {
        return;
      }

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // 수평 스와이프가 수직 스와이프보다 크면 스크롤 방지 및 시각 효과
      if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
        e.preventDefault();
        currentX.current = deltaX;
        slidePageContent(deltaX, true, window.innerWidth);
      }
    },
    [enabled]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !isSwiping.current || touchStartX.current === null || touchStartY.current === null || isAnimating.current) {
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
        isAnimating.current = true;
        animatePageOut(window.innerWidth, () => {
          isAnimating.current = false;
          onSwipeBack();
        });
      } else {
        // 스와이프 취소 - 원래 위치로 복귀
        slidePageContent(0, false, window.innerWidth);
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
      // 클린업 시 오버레이 제거
      const overlay = document.getElementById("swipe-back-overlay");
      if (overlay) {
        overlay.remove();
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
