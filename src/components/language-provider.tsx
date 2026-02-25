"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import ko from "@/i18n/ko.json";
import en from "@/i18n/en.json";

export type Language = "ko" | "en";

type Translations = Record<string, unknown>;

const translations: Record<Language, Translations> = { ko, en };

const LanguageContext = createContext<{
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}>({
  language: "ko",
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (key) => key,
});

function getNestedValue(obj: Translations, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ko");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved && (saved === "ko" || saved === "en")) {
      setLanguageState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = language === "ko" ? "en" : "ko";
    setLanguageState(newLang);
    localStorage.setItem("language", newLang);
    document.documentElement.lang = newLang;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations[language], key);
      if (value === undefined) {
        // fallback to Korean
        value = getNestedValue(translations.ko, key);
      }
      if (value === undefined) {
        return key;
      }
      // parameter substitution: {{paramName}}
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
