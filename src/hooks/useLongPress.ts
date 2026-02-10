"use client";

import { useRef, useCallback } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  moveThreshold?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  moveThreshold = 10,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      longPressTriggered.current = false;

      timerRef.current = setTimeout(() => {
        longPressTriggered.current = true;
        onLongPress();
      }, delay);
    },
    [onLongPress, delay]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startPos.current) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startPos.current.x);
      const dy = Math.abs(touch.clientY - startPos.current.y);

      if (dx > moveThreshold || dy > moveThreshold) {
        clear();
        startPos.current = null;
      }
    },
    [clear, moveThreshold]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clear();
      if (longPressTriggered.current) {
        // 롱프레스가 이미 트리거된 경우 click 방지
        e.preventDefault();
        longPressTriggered.current = false;
        return;
      }
      // 일반 탭
      if (startPos.current && onClick) {
        onClick();
      }
      startPos.current = null;
    },
    [clear, onClick]
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); // iOS 기본 컨텍스트 메뉴 방지
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onContextMenu,
  };
}
