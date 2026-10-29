import React from "react";

export type IconName =
  | "arrowDown"
  | "arrowLeft"
  | "arrowRight"
  | "arrowUp"
  | "bell"
  | "bolt"
  | "chart"
  | "check"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "close"
  | "copy"
  | "cpu"
  | "flag"
  | "gamepad"
  | "github"
  | "globe"
  | "google"
  | "grid"
  | "eye"
  | "eyeOff"
  | "key"
  | "layers"
  | "link"
  | "lock"
  | "mail"
  | "menu"
  | "moon"
  | "pause"
  | "play"
  | "plus"
  | "refresh"
  | "search"
  | "skipBack"
  | "skipForward"
  | "sort"
  | "sun"
  | "swords"
  | "terminal"
  | "trophy"
  | "upload"
  | "user";

const paths: Record<IconName, React.ReactNode> = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  chart: <><path d="M4 19h16" /><path d="M7 16V9" /><path d="M12 16V5" /><path d="M17 16v-4" /></>,
  github: <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" fill="currentColor" stroke="none" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M18 13l-6 6-6-6" />,
  sort: <path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" />,
  trophy: <path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 17h6M12 13v4M9 21h6" />,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  gamepad: <><rect x="3" y="8" width="18" height="9" rx="4" /><path d="M7 12.5h2M8 11.5v2M15 11.5h.01M17.5 13.5h.01" /></>,
  key: <><path d="M21 2l-2 2M15.4 7.6l3 3M8.5 15.5A4.5 4.5 0 1 1 14.9 9.1l4.7-4.7 3 3-4.7 4.7A4.5 4.5 0 0 1 8.5 15.5z" /><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" /></>,
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  bell: <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M9.5 19a2.5 2.5 0 0 0 5 0" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  link: <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  google: <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="currentColor" stroke="none" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></>,
  refresh: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  skipBack: <><path d="M11 19l-8-7 8-7v14z" fill="currentColor" stroke="none" /><path d="M21 19l-8-7 8-7v14z" fill="currentColor" stroke="none" /></>,
  skipForward: <><path d="M13 5l8 7-8 7V5z" fill="currentColor" stroke="none" /><path d="M3 5l8 7-8 7V5z" fill="currentColor" stroke="none" /></>,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  swords: <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M17 21l4-4" /><path d="M14 14l-2 2" /><path d="M9.5 17.5L21 6V3h-3L6.5 14.5" /><path d="M11 19l-6-6" /><path d="M7 21l-4-4" /><path d="M10 14l2 2" /></>,
  play: <path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" />,
  pause: <><path d="M8 5v14" /><path d="M16 5v14" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5" />,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /><rect x="10" y="10" width="4" height="4" rx="1" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-2.1 2.8M6.7 6.7C3.6 8.5 2 12 2 12s3.5 6 10 6a10.8 10.8 0 0 0 5.3-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
};

export function Icon({ name, size = 18, className = "", appearance = "outline" }: { readonly name: IconName; readonly size?: number; readonly className?: string; readonly appearance?: "outline" | "emphasis" }) {
  return (
    <svg aria-hidden="true" className={`icn ${className}`} fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={appearance === "emphasis" ? 2 : 1.6} viewBox="0 0 24 24" width={size}>
      {paths[name]}
    </svg>
  );
}
