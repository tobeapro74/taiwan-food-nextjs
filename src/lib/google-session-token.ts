/**
 * Google Places API Session Token 관리
 *
 * sessionToken을 사용하면 Autocomplete + Place Details 조합 호출 시
 * 한 세션으로 묶여 비용이 크게 절감됩니다 (약 70~80% 절감)
 *
 * 사용법:
 * 1. 검색 시작 시 새 토큰 생성
 * 2. Autocomplete 호출에 토큰 포함
 * 3. Place Details 호출에 동일 토큰 포함
 * 4. 선택 완료 후 토큰 무효화 (새 검색 시 새 토큰)
 */

// UUID v4 생성 함수 (crypto.randomUUID 대안)
function generateUUID(): string {
  // 브라우저/Node.js 환경 모두 지원
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: 간단한 UUID v4 생성
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// 클라이언트용 세션 토큰 관리
class SessionTokenManager {
  private currentToken: string | null = null;
  private tokenCreatedAt: number = 0;
  private readonly TOKEN_EXPIRY_MS = 3 * 60 * 1000; // 3분 (Google 권장)

  /**
   * 새 세션 토큰 생성
   * 검색 시작 시 호출
   */
  generateToken(): string {
    this.currentToken = generateUUID();
    this.tokenCreatedAt = Date.now();
    return this.currentToken;
  }

  /**
   * 현재 토큰 반환 (만료 시 새로 생성)
   */
  getToken(): string {
    const now = Date.now();

    // 토큰이 없거나 만료되었으면 새로 생성
    if (!this.currentToken || now - this.tokenCreatedAt > this.TOKEN_EXPIRY_MS) {
      return this.generateToken();
    }

    return this.currentToken;
  }

  /**
   * 토큰 무효화 (검색 완료 또는 선택 후 호출)
   */
  invalidateToken(): void {
    this.currentToken = null;
    this.tokenCreatedAt = 0;
  }

  /**
   * 토큰이 유효한지 확인
   */
  isTokenValid(): boolean {
    if (!this.currentToken) return false;
    return Date.now() - this.tokenCreatedAt <= this.TOKEN_EXPIRY_MS;
  }
}

// 싱글톤 인스턴스 (클라이언트용)
let tokenManager: SessionTokenManager | null = null;

export function getSessionTokenManager(): SessionTokenManager {
  if (!tokenManager) {
    tokenManager = new SessionTokenManager();
  }
  return tokenManager;
}

// 서버용: 단순 토큰 생성 함수
export function createSessionToken(): string {
  return generateUUID();
}

// 서버용: 토큰 검증 (기본적인 UUID 형식 체크)
export function isValidSessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  // UUID v4 형식 검증
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(token);
}
