"use client";

type HapticType = "impact" | "notification" | "selection";

const vibrationPatterns: Record<HapticType, number | number[]> = {
  impact: 10,
  notification: [10, 50, 10],
  selection: 5,
};

function triggerHaptic(type: HapticType) {
  // 1. iOS 네이티브 브리지 (Capacitor WKWebView)
  try {
    const webkit = (window as unknown as Record<string, unknown>).webkit as
      | { messageHandlers?: { haptic?: { postMessage: (msg: { type: string }) => void } } }
      | undefined;
    if (webkit?.messageHandlers?.haptic) {
      webkit.messageHandlers.haptic.postMessage({ type });
      return;
    }
  } catch {
    // 무시
  }

  // 2. Web Vibration API (Android Chrome)
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(vibrationPatterns[type]);
    } catch {
      // 무시
    }
  }
}

export function useHaptic() {
  return {
    impact: () => triggerHaptic("impact"),
    notification: () => triggerHaptic("notification"),
    selection: () => triggerHaptic("selection"),
  };
}
