"use client";

import Link from "next/link";
import { Star, ChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ---------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark" | "gold";
type ButtonSize = "sm" | "md" | "lg";

const btnBase =
  "inline-flex items-center justify-center gap-2 font-medium select-none transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";

const btnVariants: Record<ButtonVariant, string> = {
  primary: "bg-ember text-white hover:bg-ember-deep rounded-full",
  secondary:
    "bg-paper text-ink border border-line hover:border-ink-faint rounded-full",
  ghost: "bg-transparent text-ink-soft hover:bg-wash rounded-full",
  dark: "bg-inv text-white hover:bg-invhi rounded-full",
  gold: "bg-gold text-white hover:bg-[#a67b28] rounded-full",
};

const btnSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-6 text-sm",
  lg: "h-[52px] px-8 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  onClick,
  type,
  disabled,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  href?: string;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls = cn(btnBase, btnVariants[variant], btnSizes[size], className);
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

/* ----------------------------------- Chip ---------------------------------- */

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap",
        active
          ? "bg-inv text-white"
          : "bg-paper text-ink-soft border border-line hover:border-ink-faint"
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "ember" | "gold" | "dark";
  className?: string;
}) {
  const tones = {
    neutral: "bg-wash text-ink-soft",
    ember: "bg-ember text-white",
    gold: "bg-gold text-white",
    dark: "bg-inv/85 text-white backdrop-blur-sm",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------- Avatar --------------------------------- */

export function Avatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "w-8 h-8 text-[11px]", md: "w-10 h-10 text-xs", lg: "w-14 h-14 text-base" };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-inv text-white font-semibold tracking-wider shrink-0",
        sizes[size],
        className
      )}
    >
      {initials}
    </span>
  );
}

/* --------------------------------- Rating ---------------------------------- */

export function Rating({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-semibold", className)}>
      <Star className="w-3.5 h-3.5 fill-gold text-gold" />
      {value.toFixed(1)}
    </span>
  );
}

/* ------------------------------ SectionHeader ------------------------------ */

export function SectionHeader({
  title,
  sub,
  action,
  href,
}: {
  title: string;
  sub?: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="font-display text-[22px] leading-tight tracking-tight">{title}</h2>
        {sub && <p className="text-[13px] text-ink-mute mt-0.5">{sub}</p>}
      </div>
      {action && href && (
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 text-[13px] font-medium text-ink-mute hover:text-ink transition-colors"
        >
          {action}
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

/* --------------------------------- Skeleton -------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-card bg-gradient-to-r from-wash via-line to-wash bg-[length:400px_100%] animate-shimmer",
        className
      )}
    />
  );
}

/* -------------------------------- EmptyState ------------------------------- */

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-full bg-wash flex items-center justify-center text-ink-faint mb-4">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      {desc && <p className="text-[13px] text-ink-mute mt-1 max-w-[280px] leading-relaxed">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ----------------------------------- Tabs ---------------------------------- */

export function Segmented({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex bg-wash rounded-full p-1", className)}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-8 px-4 rounded-full text-[13px] font-medium transition-all",
            value === o.id ? "bg-paper text-ink shadow-card" : "text-ink-mute hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- Progress -------------------------------- */

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-[3px] rounded-full bg-paper/25 overflow-hidden", className)}>
      <div
        className="h-full bg-paper rounded-full transition-[width] duration-200"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
