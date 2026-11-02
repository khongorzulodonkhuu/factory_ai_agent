// Language runtime provided by the factory scaffold. Components call t("English text"); the English text is
// the key, src/i18n/mn.json (written by the translator agent) holds Mongolian, and anything missing falls back
// to English, so a missing translation can never break the UI.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import mn from "./i18n/mn.json";

export type Lang = "en" | "mn";
type Params = Record<string, string | number>;

const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, mn: mn as Record<string, string> };

/** Prices are stored in USD; the Mongolian UI shows tugrik at this fixed rate (edit before a demo if needed). */
export const MNT_PER_USD = 3600;
const STORAGE_KEY = "app.lang";

type LangState = { lang: Lang; setLang: (lang: Lang) => void; inlineToggles: number; registerInline: (delta: number) => void };
const LangContext = createContext<LangState>({ lang: "en", setLang: () => {}, inlineToggles: 0, registerInline: () => {} });

function storedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "mn" ? "mn" : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(storedLang);
  const [inlineToggles, setInlineToggles] = useState(0);
  const registerInline = (delta: number) => setInlineToggles((n) => n + delta);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* private mode: language just won't persist */
    }
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangContext.Provider value={{ lang, setLang, inlineToggles, registerInline }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** const t = useT(); t("Total: {amount}", { amount: "$280.00" }) */
export function useT() {
  const { lang } = useLang();
  return (text: string, params?: Params): string => {
    const template = DICTIONARIES[lang][text] ?? text;
    return params ? template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : template;
  };
}

/** formatMoney(280, "en") -> "$280.00"; formatMoney(280, "mn") -> "₮1,008,000" */
export function formatMoney(usd: number, lang: Lang): string {
  const amount = Number.isFinite(usd) ? usd : 0;
  if (lang === "mn") return `₮${Math.round(amount * MNT_PER_USD).toLocaleString("en-US")}`;
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** const money = useMoney(); money(car.dailyRate) -> "$85.00" or "₮306,000" for the current language. */
export function useMoney() {
  const { lang } = useLang();
  return (usd: number) => formatMoney(usd, lang);
}

/**
 * Money inputs in the current language. Prices are stored in USD; Mongolian users type tugrik.
 *   const cur = useCurrency();
 *   <label>{t("Max daily rate")} ({cur.code})</label>        -> "USD" or "₮"
 *   value={cur.fromUsd(filters.maxRateUsd)}                  -> 90 or 324000
 *   onChange={(e) => setMax(cur.toUsd(Number(e.target.value)))}
 */
export function useCurrency() {
  const { lang } = useLang();
  const mn = lang === "mn";
  return {
    code: mn ? "₮" : "USD",
    step: mn ? 1000 : 1,
    toUsd: (amount: number): number => (Number.isFinite(amount) ? (mn ? amount / MNT_PER_USD : amount) : 0),
    fromUsd: (usd: number): number => (Number.isFinite(usd) ? (mn ? Math.round(usd * MNT_PER_USD) : usd) : 0),
  };
}

/** EN/MN switch for the header (and the login screen): <LanguageToggle /> */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, registerInline } = useLang();
  useEffect(() => {
    registerInline(1);
    return () => registerInline(-1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      data-testid="lang-toggle"
      role="group"
      aria-label="Language"
      className={`inline-flex shrink-0 overflow-hidden rounded-full border border-border bg-surface text-xs font-semibold ${className}`}
    >
      {(["en", "mn"] as const).map((code) => (
        <button
          key={code}
          type="button"
          data-testid={`lang-${code}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`px-2.5 py-1 transition-colors ${lang === code ? "bg-primary text-white" : "text-text-muted hover:text-text"}`}
        >
          {code === "en" ? "EN" : "MN"}
        </button>
      ))}
    </div>
  );
}

/** Safety net rendered by main.tsx: a floating switch that only appears when no screen shows <LanguageToggle />. */
export function FallbackLanguageToggle() {
  const { lang, setLang, inlineToggles } = useLang();
  if (inlineToggles > 0) return null;
  return (
    <div
      data-testid="lang-toggle"
      role="group"
      aria-label="Language"
      className="fixed bottom-4 right-4 z-50 flex overflow-hidden rounded-full border border-border bg-surface text-sm shadow-md"
    >
      {(["en", "mn"] as const).map((code) => (
        <button
          key={code}
          type="button"
          data-testid={`lang-${code}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
          className={`px-3 py-1.5 font-medium ${lang === code ? "bg-primary text-white" : "text-text"}`}
        >
          {code === "en" ? "EN" : "MN"}
        </button>
      ))}
    </div>
  );
}
