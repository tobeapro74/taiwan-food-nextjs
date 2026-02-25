"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isKakaoUser?: boolean;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onSuccess,
  isKakaoUser = false,
}: DeleteAccountModalProps) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (confirmText !== t("delete_account.confirm_text")) {
      setError(t("delete_account.enter_confirm"));
      return;
    }

    if (!isKakaoUser && !password) {
      setError(t("delete_account.password_required"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: isKakaoUser ? null : password }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(t("delete_account.success"));
        onSuccess();
        onClose();
      } else {
        setError(data.error || t("delete_account.failed"));
      }
    } catch {
      setError(t("delete_account.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setConfirmText("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+80px)]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[calc(100vh-160px-env(safe-area-inset-top)-env(safe-area-inset-bottom))]">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-destructive/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">{t("delete_account.title")}</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
            <p className="font-medium text-destructive mb-2">{t("delete_account.warning")}</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{t("delete_account.warning_1")}</li>
              <li>{t("delete_account.warning_2")}</li>
              <li>{t("delete_account.warning_3")}</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("delete_account.confirm_label", { text: t("delete_account.confirm_text") })}
            </label>
            <Input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t("delete_account.confirm_text")}
              className="w-full"
            />
          </div>

          {!isKakaoUser && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t("delete_account.password_label")}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password_placeholder")}
                className="w-full"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={isLoading || confirmText !== t("delete_account.confirm_text")}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("common.processing")}
                </>
              ) : (
                t("delete_account.title")
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
