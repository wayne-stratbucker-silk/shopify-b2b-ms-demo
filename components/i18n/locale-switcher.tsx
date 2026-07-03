"use client";

import { useI18nContext } from "./locale-provider";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n/config";

/** Language selector. Renders nothing outside a LocaleProvider. */
export function LocaleSwitcher() {
  const ctx = useI18nContext();
  if (!ctx) return null;

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
      {ctx.t("footer.language")}
      <select
        value={ctx.locale}
        onChange={(e) => ctx.setLocale(e.target.value as Locale)}
        aria-label={ctx.t("footer.language")}
        style={{ height: 30, borderRadius: "var(--radius)", border: "1px solid var(--line-2)", background: "var(--bg)", color: "var(--ink)", fontSize: 12, padding: "0 8px" }}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>{LOCALE_LABEL[l]}</option>
        ))}
      </select>
    </label>
  );
}
