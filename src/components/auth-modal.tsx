"use client";

import { useState, useEffect } from "react";
import { X, LogIn, UserPlus, Eye, EyeOff, Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: number; name: string; profile_image?: string; is_admin: boolean }) => void;
}

type AuthMode = "login" | "register";

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 이메일 인증 관련 상태
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeSentMessage, setCodeSentMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 배경 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // 인증 코드 발송
  const handleSendVerification = async () => {
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    setIsSendingCode(true);
    setError("");
    setCodeSentMessage("");

    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setCodeSentMessage("인증 코드가 발송되었습니다. 이메일을 확인해주세요.");
        setCountdown(60); // 60초 후 재발송 가능
      } else {
        setError(data.error || "인증 코드 발송에 실패했습니다.");
      }
    } catch {
      setError("인증 코드 발송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingCode(false);
    }
  };

  // 인증 코드 확인
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("6자리 인증 코드를 입력해주세요.");
      return;
    }

    setIsVerifyingCode(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await res.json();

      if (data.success) {
        setIsEmailVerified(true);
        setCodeSentMessage("");
      } else {
        setError(data.error || "인증 코드가 올바르지 않습니다.");
      }
    } catch {
      setError("인증 확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      if (!email || !password) {
        setError("이메일과 비밀번호를 입력해주세요.");
        return;
      }
    } else {
      if (!name || !email || !password) {
        setError("모든 필드를 입력해주세요.");
        return;
      }
      if (!isEmailVerified) {
        setError("이메일 인증이 필요합니다.");
        return;
      }
      if (password.length < 6) {
        setError("비밀번호는 6자 이상이어야 합니다.");
        return;
      }
      if (password !== confirmPassword) {
        setError("비밀번호가 일치하지 않습니다.");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const result = await response.json();

        if (result.success) {
          onLoginSuccess(result.data);
          onClose();
          resetForm();
        } else {
          setError(result.error || "로그인에 실패했습니다.");
        }
      } else {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = await response.json();

        if (result.success) {
          // 회원가입 성공 후 자동 로그인
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const loginResult = await loginRes.json();

          if (loginResult.success) {
            onLoginSuccess(loginResult.data);
            onClose();
            resetForm();
          } else {
            setMode("login");
            setError("회원가입이 완료되었습니다. 로그인해주세요.");
          }
        } else {
          setError(result.error || "회원가입에 실패했습니다.");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("서버 연결에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
    setIsEmailVerified(false);
    setCodeSentMessage("");
    setCountdown(0);
    setError("");
    setMode("login");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 모달이 닫혀있으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+80px)]">
      <div className="bg-background w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in max-h-[calc(100vh-160px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto flex flex-col">
        {/* 헤더 */}
        <div className="bg-card px-4 py-4 flex items-center justify-between sticky top-0 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === "login" ? "로그인" : "회원가입"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-muted text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 아이콘 */}
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {mode === "login" ? (
                <LogIn className="w-8 h-8 text-primary" />
              ) : (
                <UserPlus className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 성공 메시지 */}
          {codeSentMessage && (
            <div className="bg-green-500/10 text-green-600 text-sm p-3 rounded-lg flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {codeSentMessage}
            </div>
          )}

          {/* 이름 입력 (회원가입 시) */}
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                autoComplete="name"
              />
            </div>
          )}

          {/* 이메일 입력 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">이메일</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (mode === "register") {
                    setIsEmailVerified(false);
                    setVerificationCode("");
                    setCodeSentMessage("");
                  }
                }}
                placeholder="이메일을 입력하세요"
                className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                autoComplete="email"
                disabled={mode === "register" && isEmailVerified}
              />
              {mode === "register" && !isEmailVerified && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendVerification}
                  disabled={isSendingCode || countdown > 0}
                  className="whitespace-nowrap px-3"
                >
                  {isSendingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}초`
                  ) : (
                    "인증"
                  )}
                </Button>
              )}
              {mode === "register" && isEmailVerified && (
                <div className="flex items-center px-3 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>

          {/* 인증 코드 입력 (회원가입 시, 코드 발송 후) */}
          {mode === "register" && !isEmailVerified && codeSentMessage && (
            <div>
              <label className="block text-sm font-medium mb-1.5">인증 코드 (6자리)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="인증 코드 입력"
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background text-center tracking-widest font-mono text-lg"
                  maxLength={6}
                />
                <Button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={isVerifyingCode || verificationCode.length !== 6}
                  className="whitespace-nowrap px-4"
                >
                  {isVerifyingCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "확인"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* 비밀번호 입력 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              비밀번호{mode === "register" && " (6자 이상)"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 비밀번호 확인 (회원가입 시) */}
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">비밀번호 확인</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            disabled={isLoading || (mode === "register" && !isEmailVerified)}
            className="w-full py-6 text-base"
          >
            {isLoading
              ? "처리 중..."
              : mode === "login"
              ? "로그인"
              : "회원가입"}
          </Button>

          {/* 모드 전환 */}
          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                계정이 없으신가요?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setIsEmailVerified(false);
                    setVerificationCode("");
                    setCodeSentMessage("");
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setIsEmailVerified(false);
                    setVerificationCode("");
                    setCodeSentMessage("");
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  로그인
                </button>
              </>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}
