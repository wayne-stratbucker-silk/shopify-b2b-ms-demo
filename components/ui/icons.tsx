// Inline SVG icon set — stroke-based, 24px viewBox
export type IconName =
  | "search" | "user" | "cart" | "quote" | "list" | "bolt" | "truck"
  | "shield" | "tag" | "headset" | "arrow" | "chev" | "chevR" | "plus"
  | "minus" | "x" | "filter" | "grid" | "rows" | "heart" | "upload"
  | "download" | "doc" | "users" | "building" | "pin" | "card" | "check"
  | "alert" | "info" | "more" | "copy" | "refresh" | "edit" | "trash"
  | "pkg" | "receipt" | "dollar" | "approve" | "dashboard" | "csv"
  | "phone" | "mail" | "menu" | "settings";

const paths: Record<IconName, React.ReactNode> = {
  search:    <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  user:      <><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
  cart:      <><path d="M3 4h2l2.5 12h12l2-9H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></>,
  quote:     <><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v3h3"/><path d="M8 11h8M8 15h5"/></>,
  list:      <><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="18" r="1" fill="currentColor"/></>,
  bolt:      <path d="M13 2 4 14h7l-1 8 9-12h-7z"/>,
  truck:     <><path d="M1 6h13v10H1zM14 9h5l3 3v4h-8z"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></>,
  shield:    <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></>,
  tag:       <><path d="m20 12-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></>,
  headset:   <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H4zM17 14h3v6h-3z"/><path d="M20 20a4 4 0 0 1-4 4h-1"/></>,
  arrow:     <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  chev:      <path d="m6 9 6 6 6-6"/>,
  chevR:     <path d="m9 6 6 6-6 6"/>,
  plus:      <path d="M12 5v14M5 12h14"/>,
  minus:     <path d="M5 12h14"/>,
  x:         <path d="m6 6 12 12M18 6 6 18"/>,
  filter:    <path d="M3 5h18l-7 9v6l-4-2v-4z"/>,
  grid:      <><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></>,
  rows:      <><rect x="4" y="4" width="16" height="5"/><rect x="4" y="11" width="16" height="5"/><rect x="4" y="18" width="16" height="2"/></>,
  heart:     <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>,
  upload:    <><path d="M12 4v12M7 9l5-5 5 5M4 20h16"/></>,
  download:  <><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></>,
  doc:       <><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/></>,
  users:     <><circle cx="9" cy="8" r="3.5"/><path d="M2 20c.8-3 3.5-5 7-5s6.2 2 7 5"/><circle cx="17" cy="7" r="2.5"/><path d="M16 13c2.5 0 4.5 1.5 5 4"/></>,
  building:  <><path d="M3 21h18M5 21V5l8-2v18M13 21V9l6 2v10"/><path d="M8 8h2M8 12h2M8 16h2M16 13h1M16 17h1"/></>,
  pin:       <><path d="M12 22s7-7 7-13a7 7 0 1 0-14 0c0 6 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></>,
  card:      <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></>,
  check:     <path d="m5 13 4 4L19 7"/>,
  alert:     <><path d="M12 9v4M12 17h.01"/><path d="M10.3 4 3 17a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"/></>,
  info:      <><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></>,
  more:      <g fill="currentColor"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></g>,
  copy:      <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></>,
  refresh:   <><path d="M20 11a8 8 0 0 0-14-5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14 5l2-2"/><path d="M20 20v-4h-4"/></>,
  edit:      <><path d="M4 20h4l10-10-4-4L4 16zM14 6l4 4"/></>,
  trash:     <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>,
  pkg:       <><path d="m12 3 9 5v8l-9 5-9-5V8z"/><path d="m3 8 9 5 9-5M12 13v10"/><path d="m7.5 5.5 9 5"/></>,
  receipt:   <><path d="M5 3v18l3-2 2 2 2-2 2 2 2-2 3 2V3z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  dollar:    <><path d="M12 2v20M17 6.5C17 4 15 3 12 3s-5 1.2-5 3.5S9 10 12 10s5 .8 5 3.5S15 17 12 17s-5-1.2-5-3.5"/></>,
  approve:   <><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="m9 12 2 2 4-4"/></>,
  dashboard: <><rect x="3" y="3" width="8" height="10"/><rect x="13" y="3" width="8" height="6"/><rect x="13" y="11" width="8" height="10"/><rect x="3" y="15" width="8" height="6"/></>,
  csv:       <><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
  phone:     <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1-.22 1.1.4 2.3.6 3.6.6.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.6 21 3 13.4 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.3.2 2.5.6 3.6.14.33.05.73-.22 1z"/>,
  mail:      <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></>,
  menu:      <path d="M4 6h16M4 12h16M4 18h16"/>,
  settings:  <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, className = "ic", style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
