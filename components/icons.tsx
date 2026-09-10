"use client";

/**
 * VESPER icon family — custom, rounded, app-style.
 * 24px grid · 2.1 stroke · round caps & joins · filled accents.
 * Deliberately NOT feather/lucide: chunkier, softer, more "product" than "web".
 */
import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  strokeWidth?: number;
  filled?: boolean;
};

function Svg({
  children,
  size = "1em",
  strokeWidth = 2.1,
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ------------------------------- navigation ------------------------------- */

export const Home = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.2 10.6 12 4.4l7.8 6.2" />
    <path d="M6.4 10.2v8.1c0 1 .8 1.8 1.8 1.8h7.6c1 0 1.8-.8 1.8-1.8v-8.1" />
    <path d="M10.2 20v-4.6c0-.6.5-1.1 1.1-1.1h1.4c.6 0 1.1.5 1.1 1.1V20" />
  </Svg>
);

export const Compass = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M14.9 9.1 13.3 13.3 9.1 14.9l1.6-4.2z" fill="currentColor" stroke="none" />
  </Svg>
);

export const Crown = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M4.6 8.1c2.3 1 4.8 1.5 7.4 1.5s5.1-.5 7.4-1.5c.8-.3 1.4.5.9 1.2l-1.6 4.3c-.5 1.3-1.7 2.1-3.1 2.1H8.4c-1.4 0-2.6-.8-3.1-2.1L3.7 9.3c-.5-.7.1-1.5.9-1.2Z"
      fill="currentColor"
      stroke="none"
    />
    <circle cx="7.2" cy="6.1" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="4.8" r="1.7" fill="currentColor" stroke="none" />
    <circle cx="16.8" cy="6.1" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
);

export const User = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.2" r="3.6" />
    <path d="M5.4 19.8c.4-3.3 3.2-5.4 6.6-5.4s6.2 2.1 6.6 5.4" />
  </Svg>
);

export const Search = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.2" />
    <path d="M15.6 15.6 20 20" />
  </Svg>
);

/* -------------------------------- playback -------------------------------- */

export const Play = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M8.6 6.2c-1-.6-2.2.1-2.2 1.3v9c0 1.2 1.2 1.9 2.2 1.2l7.4-4.5c.8-.5.8-1.7 0-2.3z"
      fill="currentColor"
      stroke="none"
    />
  </Svg>
);

export const Pause = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="6.2" width="3" height="11.6" rx="1.5" fill="currentColor" stroke="none" />
    <rect x="13" y="6.2" width="3" height="11.6" rx="1.5" fill="currentColor" stroke="none" />
  </Svg>
);

export const Volume2 = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.6h2.6L11 6.2v11.6L6.6 14.4H4z" fill="currentColor" stroke="none" />
    <path d="M14.6 9.6c1.1 1.2 1.1 3.6 0 4.8" />
    <path d="M17.4 7.4c2.2 2.2 2.2 7 0 9.2" />
  </Svg>
);

export const VolumeX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9.6h2.6L11 6.2v11.6L6.6 14.4H4z" fill="currentColor" stroke="none" />
    <path d="M15 10.2 19.2 14.4" />
    <path d="M19.2 10.2 15 14.4" />
  </Svg>
);

export const List = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5.6" width="16" height="12.8" rx="3.4" />
    <path d="M9.4 9.8 12 11.4l2.6-1.6" />
    <path d="M9.6 15h4.8" />
  </Svg>
);

/* -------------------------------- actions --------------------------------- */

export const Heart = ({ filled, ...p }: IconProps) => (
  <Svg {...p}>
    <path
      d="M12 19.7c-.3 0-.6-.1-.8-.3C8.3 16.8 5 14 5 10.6A3.9 3.9 0 0 1 12 8.3a3.9 3.9 0 0 1 7 2.3c0 3.4-3.3 6.2-6.2 8.8-.2.2-.5.3-.8.3Z"
      fill={filled ? "currentColor" : "none"}
    />
  </Svg>
);

export const Share2 = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 15.6V4.6" />
    <path d="M8.4 8.2 12 4.6l3.6 3.6" />
    <path d="M7 12.4h10c1.1 0 2 .9 2 2v3.6c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-3.6c0-1.1.9-2 2-2Z" />
  </Svg>
);

export const Lock = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5.6" y="10.4" width="12.8" height="9" rx="3" />
    <path d="M8.8 10.4V8a3.2 3.2 0 0 1 6.4 0v2.4" />
    <path d="M12 14.4v2" />
  </Svg>
);

export const Download = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.6v9.8" />
    <path d="M8.4 11 12 14.6 15.6 11" />
    <path d="M5.4 16.6v1.8c0 1.1.9 2 2 2h9.2c1.1 0 2-.9 2-2v-1.8" />
  </Svg>
);

export const Upload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 14.4V4.6" />
    <path d="M8.4 8.2 12 4.6l3.6 3.6" />
    <path d="M5.4 16.6v1.8c0 1.1.9 2 2 2h9.2c1.1 0 2-.9 2-2v-1.8" />
  </Svg>
);

export const Plus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6v12" />
    <path d="M6 12h12" />
  </Svg>
);

export const Check = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.4 12.6 9.6 17 18.6 7.4" />
  </Svg>
);

export const X = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.2 7.2 16.8 16.8" />
    <path d="M16.8 7.2 7.2 16.8" />
  </Svg>
);

export const Settings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 8.4h3" />
    <path d="M11.4 8.4H19" />
    <path d="M5 15.6h7.6" />
    <path d="M17 15.6H19" />
    <circle cx="9.6" cy="8.4" r="2" />
    <circle cx="14.4" cy="15.6" r="2" />
  </Svg>
);

/* --------------------------------- arrows --------------------------------- */

export const ChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.4 5.6 8 12l6.4 6.4" />
  </Svg>
);

export const ChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.6 5.6 16 12l-6.4 6.4" />
  </Svg>
);

export const ChevronUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.6 14.4 12 8l6.4 6.4" />
  </Svg>
);

export const ChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.6 9.6 12 16l6.4-6.4" />
  </Svg>
);

export const ArrowUpRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.6 16.4 16.4 7.6" />
    <path d="M9.6 7.6h6.8v6.8" />
  </Svg>
);

/* --------------------------------- content -------------------------------- */

export const Star = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M12 4.4l2.3 4.8 5.2.7-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 9.9l5.2-.7z"
      fill="currentColor"
      stroke="none"
    />
  </Svg>
);

export const Eye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.9 12S6.6 6.6 12 6.6 21.1 12 21.1 12 17.4 17.4 12 17.4 2.9 12 2.9 12Z" />
    <circle cx="12" cy="12" r="2.7" fill="currentColor" stroke="none" />
  </Svg>
);

export const Flame = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M12 3.6c.5 2 1.9 3.2 3.9 3.7-1.9.6-3.2 1.8-3.9 3.7-.7-1.9-2-3.1-3.9-3.7 2-.5 3.4-1.7 3.9-3.7Z"
      fill="currentColor"
      stroke="none"
    />
    <path d="M12 11.6c1.8 1.1 2.9 2.6 2.9 4.4a2.9 2.9 0 0 1-5.8 0c0-1.8 1.1-3.3 2.9-4.4Z" />
  </Svg>
);

export const Sparkles = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M10.4 4.6c.4 1.6 1.3 2.5 2.9 2.9-1.6.4-2.5 1.3-2.9 2.9-.4-1.6-1.3-2.5-2.9-2.9 1.6-.4 2.5-1.3 2.9-2.9Z"
      fill="currentColor"
      stroke="none"
    />
    <path
      d="M17.2 13.4c.3 1.1.9 1.7 2 2-1.1.3-1.7.9-2 2-.3-1.1-.9-1.7-2-2 1.1-.3 1.7-.9 2-2Z"
      fill="currentColor"
      stroke="none"
    />
  </Svg>
);

export const Trophy = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8.2 4.6h7.6v3.6a3.8 3.8 0 0 1-7.6 0z" />
    <path d="M8.2 5.8H5.8v1.4c0 1.6 1.1 2.7 2.6 2.7" />
    <path d="M15.8 5.8h2.4v1.4c0 1.6-1.1 2.7-2.6 2.7" />
    <path d="M12 11.9v3.3" />
    <path d="M9 19.8h6l-.7-2.2H9.7z" />
  </Svg>
);

export const Zap = (p: IconProps) => (
  <Svg {...p}>
    <path
      d="M13.6 3.4 7 13.1h4.1l-.7 7.5 6.6-9.7h-4.1z"
      fill="currentColor"
      stroke="none"
    />
  </Svg>
);

export const ShieldCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.6 5.6 6.1v5.4c0 4 2.7 7.2 6.4 8.5 3.7-1.3 6.4-4.5 6.4-8.5V6.1z" />
    <path d="M9.4 11.9 11.4 14l3.4-3.6" />
  </Svg>
);

export const BadgeCheck = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M8.8 12.2 11 14.4l4.2-4.6" />
  </Svg>
);

export const Clock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.4V12l3.2 2" />
  </Svg>
);

export const CalendarDays = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="6.2" width="16" height="14" rx="3.4" />
    <path d="M4.6 10.4h14.8" />
    <path d="M9 4.4v3" />
    <path d="M15 4.4v3" />
  </Svg>
);

export const History = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.4 12a7.6 7.6 0 1 0 2.6-5.7" />
    <path d="M4.4 5.4v3.4h3.4" />
    <path d="M12 8.6V12l2.6 1.6" />
  </Svg>
);

/* -------------------------------- analytics ------------------------------- */

export const TrendingUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.4 16.4 9.6 11l3.4 3.4L19.6 6.8" />
    <path d="M15.4 6.8h4.2V11" />
  </Svg>
);

export const Users = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.6" cy="8.6" r="3.2" />
    <path d="M3.8 19.6c.4-2.9 2.8-4.8 5.8-4.8s5.4 1.9 5.8 4.8" />
    <path d="M16.2 6.2a3.2 3.2 0 0 1 0 6.2" />
    <path d="M18 14.6c1.4.5 2.4 1.8 2.6 3.6" />
  </Svg>
);

export const DollarSign = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.6v14.8" />
    <path d="M15.6 9c0-1.7-1.6-2.6-3.6-2.6s-3.6.9-3.6 2.6 1.6 2.4 3.6 2.8 3.6 1 3.6 2.8-1.6 2.6-3.6 2.6-3.6-.9-3.6-2.6" />
  </Svg>
);

export const Tv = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.6" y="7.4" width="16.8" height="10.4" rx="3" />
    <path d="M9 20.4h6" />
    <path d="M12 17.8v2.6" />
  </Svg>
);

/* --------------------------------- status --------------------------------- */

export const Loader2 = ({ className, ...p }: IconProps) => (
  <Svg {...p} className={className}>
    <circle cx="12" cy="12" r="8.4" strokeOpacity="0.25" />
    <path d="M12 3.6a8.4 8.4 0 0 1 8.4 8.4" />
  </Svg>
);

/* ------------------------------ brand marks ------------------------------- */

export const GoogleMark = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" className={p.className} aria-hidden="true">
    <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" fill="#4285F4" />
    <path d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" fill="#34A853" />
    <path d="M6.4 14a6 6 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.9z" fill="#FBBC05" />
    <path d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.6L6.4 10a5.9 5.9 0 0 1 5.6-4.1Z" fill="#EA4335" />
  </svg>
);

export const XMark = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" className={p.className} aria-hidden="true">
    <path d="M17.5 3.6h3.1l-6.8 7.8 8 10.6h-6.3l-4.9-6.5-5.6 6.5H2l7.3-8.3L1.7 3.6h6.4l4.6 6.1zm-1.1 16.3h1.7L6.6 5.3H4.8z" />
  </svg>
);

export const TelegramMark = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" className={p.className} aria-hidden="true">
    <path d="M21.7 4.3 2.9 11.5c-1 .4-1 1.7.1 2l4.6 1.4 1.8 5.5c.3.9 1.4 1 1.9.2l2.5-3.1 4.6 3.4c.7.5 1.7.1 1.9-.7l3.4-14.4c.2-1-.7-1.8-1.9-1.5Zm-3.3 4.2-8.9 6.3-.6 4.3-.8-3.4 7-6.3c.3-.3 0-.9-.4-.6l-8.4 5.3-3.3-1 11.2-5.2c.8-.3 1.6.2 1.7 1 .1.6-.2 1.2-1.5 1.6Z" />
  </svg>
);

export const Bell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4.2a5.4 5.4 0 0 1 5.4 5.4c0 3.2.7 4.6 1.6 5.8H5c.9-1.2 1.6-2.6 1.6-5.8A5.4 5.4 0 0 1 12 4.2Z" />
    <path d="M10.2 18.6a1.9 1.9 0 0 0 3.6 0" />
  </Svg>
);

export const BarChart3 = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 19V11" />
    <path d="M12 19V5.6" />
    <path d="M18 19v-5.5" />
    <path d="M4 19h16" />
  </Svg>
);

export const Film = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5.6" width="16" height="12.8" rx="3.2" />
    <path d="M8.4 5.6v12.8" />
    <path d="M15.6 5.6v12.8" />
    <path d="M4 9.6h4.4M4 14.4h4.4M15.6 9.6H20M15.6 14.4H20" />
  </Svg>
);

export const Wallet = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="7" width="16" height="12.4" rx="3.2" />
    <path d="M4 10.8h16" opacity="0" />
    <path d="M16.2 13.2h1.6" />
    <path d="M6.8 7V6a2 2 0 0 1 2.6-1.9l7.2 2.1" />
  </Svg>
);

export const Megaphone = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 10.4 16.8 5.8v10.8L5 12.4z" />
    <path d="M8 11.4v4.8c0 1.1.9 2 2 2h.4c1.1 0 2-.9 2-2v-3.2" />
    <path d="M16.8 8.6c1.4.3 2.4 1.6 2.4 3.1s-1 2.8-2.4 3.1" />
  </Svg>
);

export const Sun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 3.4v2.2" />
    <path d="M12 18.4v2.2" />
    <path d="M3.4 12h2.2" />
    <path d="M18.4 12h2.2" />
    <path d="M6.2 6.2l1.6 1.6" />
    <path d="M16.2 16.2l1.6 1.6" />
    <path d="M17.8 6.2l-1.6 1.6" />
    <path d="M7.8 16.2l-1.6 1.6" />
  </Svg>
);

export const Moon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.4A8.2 8.2 0 0 1 9.6 4a8.4 8.4 0 1 0 10.4 10.4Z" fill="currentColor" stroke="none" />
  </Svg>
);

/* ------------------------------ ops additions ----------------------------- */

export const Trash2 = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.8 7.2h14.4" />
    <path d="M9.6 7.2V5.4c0-.7.5-1.2 1.2-1.2h2.4c.7 0 1.2.5 1.2 1.2v1.8" />
    <path d="M6.6 7.2 7.4 18c.1 1 .9 1.8 2 1.8h5.2c1.1 0 1.9-.8 2-1.8l.8-10.8" />
    <path d="M10.5 11v5" />
    <path d="M13.5 11v5" />
  </Svg>
);

export const Filter = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.6 6.4h14.8" />
    <path d="M7.4 12h9.2" />
    <path d="M10.2 17.6h3.6" />
  </Svg>
);

export const RefreshCw = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19.4 11.2A7.4 7.4 0 0 0 6.6 7.4L4.6 9.4" />
    <path d="M4.6 12.8a7.4 7.4 0 0 0 12.8 3.8l2-2" />
    <path d="M4.6 5.6v3.8h3.8" />
    <path d="M19.4 18.4v-3.8h-3.8" />
  </Svg>
);

export const ExternalLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.6 5.4h5v5" />
    <path d="M18.6 5.4 11 13" />
    <path d="M16.4 13.6v3.8c0 1.1-.9 2-2 2H6.6c-1.1 0-2-.9-2-2V9.6c0-1.1.9-2 2-2h3.8" />
  </Svg>
);

export const Layers = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 4.2 7.4 3.6L12 11.4 4.6 7.8 12 4.2Z" />
    <path d="m4.6 12.2 7.4 3.6 7.4-3.6" />
    <path d="m4.6 16.4 7.4 3.6 7.4-3.6" />
  </Svg>
);

export const FileText = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4.4H7.6c-1.1 0-2 .9-2 2v11.2c0 1.1.9 2 2 2h8.8c1.1 0 2-.9 2-2V8.8L14 4.4Z" />
    <path d="M13.8 4.6v4.2h4.4" />
    <path d="M9 13h6" />
    <path d="M9 16h4" />
  </Svg>
);

export const AlertTriangle = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 5.1 3.6 16.6c-.8 1.3.2 3 1.7 3h13.4c1.5 0 2.5-1.7 1.7-3L13.7 5.1a2 2 0 0 0-3.4 0Z" />
    <path d="M12 10v3.4" />
    <path d="M12 16.8h.01" />
  </Svg>
);

export const LogOut = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.6 7.4V5.6c0-1.1-.9-2-2-2H6.6c-1.1 0-2 .9-2 2v12.8c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-1.8" />
    <path d="M19.4 12H9.8" />
    <path d="M16.6 8.8 19.8 12l-3.2 3.2" />
  </Svg>
);

/** Envelope mark — sits beside the OAuth marks on the sign-in screen. */
export const MailMark = (p: IconProps) => (
  <Svg {...p} strokeWidth={p.strokeWidth ?? 1.9}>
    <path d="M4.4 6.6h15.2c.9 0 1.6.7 1.6 1.6v7.6c0 .9-.7 1.6-1.6 1.6H4.4c-.9 0-1.6-.7-1.6-1.6V8.2c0-.9.7-1.6 1.6-1.6Z" />
    <path d="m3.4 7.8 7.7 5.1c.6.4 1.4.4 2 0l7.5-5.1" />
  </Svg>
);
