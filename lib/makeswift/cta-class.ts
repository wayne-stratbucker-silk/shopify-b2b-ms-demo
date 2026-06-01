export type CtaStyle =
  | "primary"
  | "secondary"
  | "inverted-light"
  | "inverted-dark";

// Shared option list for every CTA-style Select control in the Makeswift editor.
// Keep this the single source of truth so new styles only need to be added once.
export const CTA_STYLE_OPTIONS: { label: string; value: CtaStyle }[] = [
  { label: "Primary", value: "primary" },
  { label: "Secondary", value: "secondary" },
  { label: "Inverted (light)", value: "inverted-light" },
  { label: "Inverted (dark)", value: "inverted-dark" },
];

// Map each merchandiser-selected CTA style to its real button classes.
//   primary        → `.btn`                   (navy fill, white text)
//   secondary      → `.btn .btn-ghost`        (transparent, dark border/text)
//   inverted-light → `.btn .btn-inverted-light` (transparent, white border/text — for dark bgs)
//   inverted-dark  → `.btn .btn-inverted-dark`  (navy fill — for light/colored sections)
// Extra modifier classes (e.g. `btn-lg`) are appended verbatim.
const BASE_CLASS: Record<CtaStyle, string> = {
  primary: "btn",
  secondary: "btn btn-ghost",
  "inverted-light": "btn btn-inverted-light",
  "inverted-dark": "btn btn-inverted-dark",
};

export function ctaClass(
  style: CtaStyle | undefined,
  fallback: CtaStyle,
  ...modifiers: string[]
): string {
  const base = BASE_CLASS[style ?? fallback];
  return [base, ...modifiers].filter(Boolean).join(" ");
}
