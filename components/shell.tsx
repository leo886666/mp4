"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, History, User, Search, Play, Bell } from "@/components/icons";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui";

/** Bottom tabs: Home · Discover · History · Me (VIP lives on the profile). */
const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/me/history", label: "History", icon: History },
  { href: "/me", label: "Me", icon: User },
];

const HIDE_CHROME = ["/watch", "/admin", "/checkout"];

/**
 * On phones the brand mark gives way to the page it's on — the tab bar already
 * says where you are, so the top slot is more useful as a title. Desktop keeps
 * the wordmark because the sidebar carries the context there.
 */
const MOBILE_TITLES: Record<string, string> = {
  "/me/history": "History",
  "/me/favorites": "My list",
  "/me/orders": "Orders",
  "/me": "Me",
};

function useHidden() {
  const pathname = usePathname() || "/";
  return HIDE_CHROME.some((p) => pathname.startsWith(p));
}

export function TopBar() {
  const pathname = usePathname() || "/";
  const { user, ready, unread } = useAuth();
  const mobileTitle = MOBILE_TITLES[pathname];
  if (useHidden()) return null;

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-xl hairline-b">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-5 lg:px-8 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0 shrink">
          {mobileTitle && (
            <span className="lg:hidden font-display text-[21px] tracking-tight truncate">{mobileTitle}</span>
          )}
          <Link href="/" className={cn("items-center gap-2 shrink-0", mobileTitle ? "hidden lg:flex" : "flex")}>
            <span className="w-7 h-7 rounded-lg bg-inv flex items-center justify-center">
              <Play className="w-3.5 h-3.5 fill-white text-white -ml-px" />
            </span>
            <span className="font-display text-xl tracking-[0.18em] font-semibold">{BRAND}</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            className="w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-wash transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" strokeWidth={1.8} />
          </Link>
          <Link
            href="/studio"
            className="hidden lg:inline-flex h-9 px-4 items-center rounded-full text-[13px] font-medium text-ink-soft hover:bg-wash transition-colors"
          >
            Creator Studio
          </Link>

          {!ready ? (
            <span className="ml-1 w-[104px] sm:w-[152px] h-9 rounded-full bg-wash animate-pulse" />
          ) : user ? (
            <>
              <Link
                href="/me"
                className="relative w-9 h-9 hidden lg:flex items-center justify-center rounded-full text-ink-soft hover:bg-wash transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" strokeWidth={1.8} />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-ember ring-2 ring-paper" />
                )}
              </Link>
              <Link href="/me" className="ml-1" aria-label="Profile">
                <Avatar initials={user.initials} size="sm" />
              </Link>
            </>
          ) : (
            /* Signed out: sign-up is the loudest thing in the bar. */
            <div className="ml-1 flex items-center gap-1.5">
              <Link
                href={`/login?next=${encodeURIComponent(pathname || "/")}`}
                className="hidden sm:inline-flex h-9 px-3 sm:px-3.5 items-center rounded-full text-[13px] font-semibold text-ink hover:bg-wash transition-colors whitespace-nowrap"
              >
                Log in
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(pathname || "/")}`}
                className="inline-flex h-9 px-3.5 sm:px-4 items-center rounded-full bg-ember text-white text-[13px] font-semibold hover:bg-ember-deep transition-colors whitespace-nowrap shadow-[0_6px_18px_-8px_rgb(var(--ember))]"
              >
                Sign up free
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function TabBar() {
  const pathname = usePathname() || "/";
  if (useHidden()) return null;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper/92 backdrop-blur-xl hairline-t">
      <div className="grid grid-cols-4 pb-safe">
        {TABS.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : t.href === "/me" ? pathname === "/me" : pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-col items-center gap-1 pt-2.5 pb-2.5 transition-colors",
                active ? "text-ink" : "text-ink-faint hover:text-ink-soft"
              )}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.7} />
              <span className={cn("text-[10px] tracking-wide", active && "font-semibold")}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const SIDE = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/me/history", label: "Watch history", icon: History },
  { href: "/studio", label: "Creator Studio", icon: Play },
  { href: "/me", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname() || "/";
  const { user, ready } = useAuth();
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col px-5 py-8 hairline-r bg-paper">
      <Link href="/" className="flex items-center gap-2.5 px-2 mb-10">
        <span className="w-8 h-8 rounded-xl bg-inv flex items-center justify-center">
          <Play className="w-4 h-4 fill-white text-white -ml-px" />
        </span>
        <span className="font-display text-2xl tracking-[0.16em] font-semibold">{BRAND}</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {SIDE.map((s) => {
          const active = s.href === "/" ? pathname === "/" : s.href === "/me" ? pathname === "/me" : pathname.startsWith(s.href);
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                "flex items-center gap-3 h-11 px-3 rounded-xl text-[14px] font-medium transition-colors",
                active ? "bg-wash text-ink" : "text-ink-mute hover:text-ink hover:bg-wash/60"
              )}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              {s.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3">
        {ready && !user ? (
          <div className="rounded-2xl bg-inv text-white p-5">
            <p className="font-display text-lg leading-snug">Create a free account.</p>
            <p className="text-[12px] text-white/65 mt-1.5 leading-relaxed">
              Keep your place in every series, across every device.
            </p>
            <Link
              href="/register"
              className="mt-3.5 inline-flex items-center h-9 px-4 rounded-full bg-ember text-white text-[12.5px] font-semibold hover:bg-ember-deep transition-colors"
            >
              Sign up free
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-inv text-white p-5">
            <p className="font-display text-lg leading-snug">Stories that fit your night.</p>
            <Link
              href="/vip"
              className="mt-3 inline-flex items-center h-8 px-4 rounded-full bg-paper text-ink text-[12px] font-semibold hover:bg-paper/90 transition-colors"
            >
              Membership
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hidden = useHidden();
  return (
    <div className="min-h-screen">
      {!hidden && <Sidebar />}
      <div className={hidden ? "" : "lg:pl-[240px]"}>
        <TopBar />
        <main className={hidden ? "" : "pb-24 lg:pb-16"}>{children}</main>
      </div>
      <TabBar />
    </div>
  );
}
