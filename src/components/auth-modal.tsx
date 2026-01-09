"use client";

import { useState } from "react";
import { X, User, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { id: number; name: string; profile_image?: string; is_admin: boolean }) => void;
}

type AuthMode = "login" | "register";

export function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !password) {
      setError("이름과 비밀번호를 입력해주세요.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const result = await response.json();

      if (result.success) {
        if (mode === "register") {
          // 회원가입 성공 후 자동 로그인
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, password }),
          });
          const loginResult = await loginRes.json();
          if (loginResult.success) {
            onLoginSuccess(loginResult.data);
            onClose();
            resetForm();
          }
        } else {
          onLoginSuccess(result.data);
          onClose();
          resetForm();
        }
      } else {
        setError(result.error || "처리 중 오류가 발생했습니다.");
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
    setPassword("");
    setConfirmPassword("");
    setError("");
    setMode("login");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in">
        {/* 헤더 */}
        <div className="bg-primary px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-foreground">
            {mode === "login" ? "로그인" : "회원가입"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-white/20 text-primary-foreground"
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

          {/* 이름 입력 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              autoComplete="username"
            />
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label className="block text-sm font-medium mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {/* 비밀번호 확인 (회원가입 시) */}
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">비밀번호 확인</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                autoComplete="new-password"
              />
            </div>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            disabled={isLoading}
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

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
