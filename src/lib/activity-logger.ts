// 활동 로그 기록 유틸리티 (클라이언트용)
// 비동기로 백그라운드에서 전송, 실패해도 무시

export function logActivity(action: string, details?: Record<string, string>) {
  try {
    fetch("/api/admin/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, details }),
    }).catch(() => {
      // 로그 전송 실패 무시
    });
  } catch {
    // 무시
  }
}
