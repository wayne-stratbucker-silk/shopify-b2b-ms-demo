"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { MESSAGES, type MessageKey } from "@/lib/i18n/messages";

interface I18nApi {
  locale: Locale;
  t: (key: MessageKey) => string;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<I18nApi | null>(null);

/** Raw context — null outside a provider. Used by the switcher to self-hide. */
export function useI18nContext(): I18nApi | null {
  return useContext(Ctx);
}

/** Always-safe accessor: falls back to English + a no-op setter with no provider. */
export function useI18n(): I18nApi {
  return (
    useContext(Ctx) ?? {
      locale: DEFAULT_LOCALE,
      t: (k) => MESSAGES[DEFAULT_LOCALE][k] ?? k,
      setLocale: () => {},
    }
  );
}

/**
 * Client i18n provider. `initialLocale` comes from the server (the locale
 * cookie) so first paint matches the persisted language — no flash. Switching
 * updates state (instant, no reload) and persists to the cookie.
 */
export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, []);

  const t = useCallback(
    (key: MessageKey) => MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key,
    [locale],
  );

  return <Ctx.Provider value={{ locale, t, setLocale }}>{children}</Ctx.Provider>;
}
