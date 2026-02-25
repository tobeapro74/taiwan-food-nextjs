"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Mail, Loader2, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initKakaoSDK, kakaoLogin } from "@/lib/kakao";
import { useLanguage } from "@/components/language-provider";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: number; name: string; profile_image?: string; is_admin: boolean }) => void;
}

type AuthMode = "login" | "register";

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

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

  // 카카오 로그인 핸들러
  const handleKakaoLogin = async () => {
    setError("");
    initKakaoSDK();
    const isNative = (window as any).Capacitor?.isNativePlatform?.() === true;
    if (isNative) {
      onClose();
    }
    await kakaoLogin();
  };

  // 인증 코드 발송
  const handleSendVerification = async () => {
    if (!email) {
      setError(t("auth.email_required"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("auth.email_invalid"));
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
        setCodeSentMessage(t("auth.code_sent"));
        setCountdown(60);
      } else {
        setError(data.error || t("auth.code_send_failed"));
      }
    } catch {
      setError(t("auth.code_send_error"));
    } finally {
      setIsSendingCode(false);
    }
  };

  // 인증 코드 확인
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError(t("auth.code_invalid"));
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
        setError(data.error || t("auth.code_invalid"));
      }
    } catch {
      setError(t("auth.code_verify_error"));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "login") {
      if (!email || !password) {
        setError(t("auth.email_password_required"));
        return;
      }
    } else {
      if (!name || !email || !password) {
        setError(t("auth.all_fields_required"));
        return;
      }
      if (!isEmailVerified) {
        setError(t("auth.email_verify_required"));
        return;
      }
      if (password.length < 6) {
        setError(t("auth.password_min_length"));
        return;
      }
      if (password !== confirmPassword) {
        setError(t("auth.password_mismatch"));
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
          setError(result.error || t("auth.login_failed"));
        }
      } else {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const result = await response.json();

        if (result.success) {
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
            setError(t("auth.register_success"));
          }
        } else {
          setError(result.error || t("auth.register_failed"));
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(t("auth.server_error"));
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
    setShowEmailForm(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+80px)]">
      <div className="bg-background w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in max-h-[calc(100vh-160px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-y-auto flex flex-col">
        {/* 헤더 */}
        <div className="bg-card px-4 py-4 flex items-center justify-between sticky top-0 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {mode === "login" ? t("auth.login_title") : t("auth.register_title")}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-muted text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* 카카오 로그인 버튼 */}
          <button
            type="button"
            onClick={handleKakaoLogin}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-medium text-[15px] transition-colors"
            style={{ backgroundColor: "#FEE500", color: "#000000" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9 0.6C4.029 0.6 0 3.713 0 7.551C0 9.942 1.558 12.048 3.931 13.303L2.933 16.909C2.844 17.221 3.213 17.466 3.479 17.278L7.736 14.41C8.151 14.462 8.572 14.502 9 14.502C13.971 14.502 18 11.389 18 7.551C18 3.713 13.971 0.6 9 0.6Z"
                fill="#000000"
              />
            </svg>
            {mode === "login" ? t("auth.kakao_login") : t("auth.kakao_start")}
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t("auth.or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* 이메일 로그인/회원가입 토글 */}
          <button
            type="button"
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="w-4 h-4" />
            {mode === "login" ? t("auth.email_login") : t("auth.email_register")}
            {showEmailForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* 이메일 폼 (접힌 상태에서 펼치기) */}
          {showEmailForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("auth.name_placeholder")}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                    autoComplete="name"
                  />
                </div>
              )}

              {/* 이메일 입력 */}
              <div>
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
                    placeholder={t("auth.email_placeholder")}
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
                        `${countdown}s`
                      ) : (
                        t("auth.verify")
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
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder={t("auth.verify_code_placeholder")}
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
                        t("common.confirm")
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* 비밀번호 입력 */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.password_placeholder")}
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
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t("auth.confirm_password_placeholder")}
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
                  ? t("common.processing")
                  : mode === "login"
                  ? t("common.login")
                  : t("common.register")}
              </Button>
            </form>
          )}

          {/* 모드 전환 */}
          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("auth.no_account")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setIsEmailVerified(false);
                    setVerificationCode("");
                    setCodeSentMessage("");
                    setShowEmailForm(false);
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  {t("common.register")}
                </button>
              </>
            ) : (
              <>
                {t("auth.has_account")}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setIsEmailVerified(false);
                    setVerificationCode("");
                    setCodeSentMessage("");
                    setShowEmailForm(false);
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  {t("common.login")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
