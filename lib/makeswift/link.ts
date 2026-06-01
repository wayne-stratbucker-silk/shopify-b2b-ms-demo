import type { MouseEvent } from "react";

// The value a component receives for a prop declared with the Makeswift `Link`
// control. Makeswift's runtime resolves the raw LinkData (Open page / Open URL /
// Send email / Call phone / Scroll to block) into this shape before render —
// `href` is already a real pathname/URL/mailto/tel, so components never touch
// the underlying LinkData or resolve page ids themselves.
export interface MSLink {
  href: string;
  target?: "_blank" | "_self";
  onClick?: (e: MouseEvent<Element>) => void;
}

// Spread onto an <a> or next/link <Link>. Falls back to `fallback` ("#") when
// the link is unset, so an unconfigured CTA renders inert rather than broken —
// matching the `?? "#"` behaviour these components used with the old text field.
export function linkProps(link?: MSLink, fallback = "#") {
  return {
    href: link?.href || fallback,
    target: link?.target,
    onClick: link?.onClick,
  };
}

// True when the editor has actually configured a destination on the control.
// Makeswift's Link control resolves an UNSET value to `{ href: '#', onClick }`
// (see @makeswift/controls/.../link.js → `emptyLink`), so a plain `link?.href`
// truthy check reports false-positives for every empty CTA. Use this to decide
// whether to render an optional CTA, or to fall through to an alternate href.
export function hasLink(link?: MSLink): boolean {
  return Boolean(link?.href) && link?.href !== "#";
}
