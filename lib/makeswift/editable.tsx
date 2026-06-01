"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type JSX,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// EditableRegion — wrapper for inline (click-on-canvas) RichText fields.
//
// Inline RichText must always render its wrapper element so the region stays
// clickable in the Makeswift builder. The downside is that an empty region
// still reserves space (line-height / margin) on the live site, and the Slate
// editor element keeps the region mounted in the builder's "interact" preview.
// This wrapper reconciles every context:
//
//   • live storefront                    → collapse when empty (no blank gap)
//   • builder "interact" (preview)       → collapse when empty (matches live)
//   • builder content mode (adding text) → stay visible + click-to-edit affordance
//   • builder build mode                 → collapse when empty; reappears the
//                                          instant the admin enters content mode
//
// The signal is `contenteditable="true"`, which Makeswift's RichText (Slate)
// sets on its editing surface ONLY in content mode — `readOnly` everywhere else
// (see EditableTextV2: `readOnly: editMode !== BuilderEditMode.CONTENT`). It is
// public + DOM-observable, unlike `useBuilderEditMode`, which @makeswift/runtime
// does not expose on any public export path. Emptiness is read from the rendered
// DOM (`textContent`) — the only mode-agnostic signal, since a RichText
// ReactNode's emptiness isn't knowable before render and CSS `:empty` can't fire
// while the Slate editor element is mounted. Slate's placeholder is a CSS
// `::before`, so it never counts as content; a media-only region (icon/image, no
// text) is correctly treated as non-empty.
// ─────────────────────────────────────────────────────────────────────────────

type EditableRegionProps = HTMLAttributes<HTMLElement> & {
  /** The element to render — span | h1 | h2 | p | div, etc. Defaults to div. */
  as?: keyof JSX.IntrinsicElements;
};

export function EditableRegion({
  as = "div",
  children,
  className,
  style,
  ...rest
}: EditableRegionProps) {
  const ref = useRef<HTMLElement>(null);
  const [{ collapse, affordance }, setState] = useState({
    collapse: false,
    affordance: false,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const hasText = (el.textContent ?? "").trim().length > 0;
      const hasMedia = !!el.querySelector("img,svg,video,iframe,picture");
      // True only while the admin is inline-editing (builder content mode).
      const editing =
        el.isContentEditable || !!el.querySelector('[contenteditable="true"]');
      const empty = !hasText && !hasMedia;
      setState({ collapse: empty && !editing, affordance: empty && editing });
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["contenteditable"],
    });
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className:
        [className, affordance ? "ms-editable-empty" : null]
          .filter(Boolean)
          .join(" ") || undefined,
      style: collapse ? { ...style, display: "none" } : style,
      ...rest,
    },
    children,
  );
}
