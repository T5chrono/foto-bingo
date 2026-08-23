import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  STRINGS,
  initialLocale,
  saveLocale,
  type Locale,
} from "../lib/locale";
import type { Strings } from "../lib/strings/pl";

/**
 * Język jako stan aplikacji — dokładnie z tego samego powodu, co kod gościa
 * w `useGuestToken`: sam zapis w localStorage nie przerysowuje ekranu, a
 * przeładowanie strony po zmianie języka to drugie pobranie aplikacji tam,
 * gdzie ktoś stoi z jedną kreską zasięgu.
 */
type Ctx = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Strings;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // `<html lang>` to nie ozdoba: czytnik ekranu bierze stąd wymowę, a
  // przeglądarka — dzielenie wyrazów i podpowiedź tłumaczenia strony.
  useEffect(() => {
    document.documentElement.lang = STRINGS[locale].htmlLang;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setLocaleState(next);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t: STRINGS[locale] }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale poza LocaleProvider");
  return ctx;
}

/** Skrót dla komponentów, które potrzebują wyłącznie tekstów. */
export function useT(): Strings {
  return useLocale().t;
}
