"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, History, Heart, Download, Settings, ChevronRight, Wallet, Bell, BadgeCheck } from "@/components/icons";
import { Button, SectionHeader, Avatar } from "@/components/ui";
import { ThemeSwitch } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { money, cn } from "@/lib/utils";

const MENU = [
  { icon: History, label: "Watch history", note: "Synced to your account", href: "/me/history" },
  { icon: Heart, label: "My list", note: "Favorites", href: "/me/favorites" },
  { icon: Wallet, label: "Orders & receipts", note: "", href: "/me/orders" },
  { icon: Download, label: "Downloads", note: "VIP feature", href: "/vip" },
  { icon: Settings, label: "Creator Studio", note: "Publish a series", href: "/studio" },
];

export default function MePage() {
  const { user, subscription, stats, unread, ready, signOut } = useAuth();
  const router = useRouter();

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-16 pb-20 text-center animate-fade-up">
        <Avatar initials="?" size="lg" className="mx-auto" />
        <h1 className="font-display text-[26px] tracking-tight mt-5">You're browsing as a guest</h1>
        <p className="text-[14px] text-ink-mute mt-2 leading-relaxed">
          Create a free account to keep your place in every series, build a list, and pick up on any device.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <Button href="/register" size="lg">Sign up free</Button>
          <Button href="/login" variant="secondary" size="lg">I already have an account</Button>
        </div>
        <section className="mt-12 text-left">
          <SectionHeader title="Appearance" sub="Follows your system by default" />
          <div className="rounded-2xl ring-1 ring-line px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium">Theme</p>
              <p className="text-[12px] text-ink-mute mt-0.5">Light or dark — remembered on this device</p>
            </div>
            <ThemeSwitch />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-6 lg:pt-10 animate-fade-up">
      <div className="flex items-center gap-4">
        <Avatar initials={user?.initials ?? "?"} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-[26px] tracking-tight flex items-center gap-2">
            {user?.name ?? "…"}
            {user?.vip && <BadgeCheck className="w-5 h-5 text-gold" />}
          </h1>
          <p className="text-[13px] text-ink-mute mt-0.5 truncate">{user?.email}</p>
        </div>
        <div className="flex-1" />
        <Button variant="secondary" size="md" onClick={async () => { await signOut(); router.push("/"); }}>
          Sign out
        </Button>
      </div>

      {stats && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Episodes watched", String(stats.watched)],
            ["Minutes", stats.minutes.toLocaleString()],
            ["In my list", String(stats.favorites)],
            ["Lifetime spend", money(stats.spentCents / 100)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl ring-1 ring-line p-4 bg-wash">
              <p className="text-[12px] text-ink-mute">{label}</p>
              <p className="font-display text-[22px] tracking-tight mt-1 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl p-6 text-white relative overflow-hidden bg-inv">
        <div className="absolute right-5 top-5">
          <Crown className={cn("w-8 h-8", user?.vip ? "fill-gold text-gold" : "text-white/15")} />
        </div>
        <p className="text-[12px] font-semibold tracking-widest text-gold uppercase">
          {user?.vip ? "VIP active" : "Not VIP yet"}
        </p>
        <h2 className="font-display text-[24px] mt-2 leading-snug max-w-[420px]">
          {user?.vip
            ? subscription
              ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
              : `VIP through ${new Date(user.vipUntil).toLocaleDateString()}`
            : "Unlock every episode. Zero ads. Zero waiting."}
        </h2>
        <p className="text-[13px] text-white/65 mt-1.5">
          {user?.vip
            ? subscription?.autoRenew
              ? "Auto-renew is on — cancel any time."
              : "Auto-renew is off — access ends at the period end."
            : "From $6.99/week · cancel anytime"}
        </p>
        <Link href="/vip" className="mt-4 inline-flex">
          <Button variant="gold" size="md">
            <Crown className="w-4 h-4 fill-white" />
            {user?.vip ? "Manage membership" : "Go VIP"}
          </Button>
        </Link>
      </div>

      <section className="mt-8">
        <SectionHeader title="Appearance" sub="Follows your system by default" />
        <div className="rounded-2xl ring-1 ring-line px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium">Theme</p>
            <p className="text-[12px] text-ink-mute mt-0.5">Light or dark — remembered on this device</p>
          </div>
          <ThemeSwitch />
        </div>
      </section>

      <section className="mt-10 pb-8">
        <div className="flex flex-col divide-y divide-line rounded-2xl ring-1 ring-line overflow-hidden">
          {MENU.map((m) => (
            <Link key={m.label} href={m.href} className="flex items-center gap-4 px-4 py-4 hover:bg-wash/60 transition-colors">
              <span className="w-9 h-9 rounded-xl bg-wash ring-1 ring-line flex items-center justify-center">
                <m.icon className="w-[18px] h-[18px] text-ink-soft" strokeWidth={1.8} />
              </span>
              <span className="text-[14px] font-medium flex-1">{m.label}</span>
              {m.note && <span className="text-[12px] text-ink-faint hidden sm:block">{m.note}</span>}
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </Link>
          ))}
          {["reviewer", "admin", "owner"].includes(user?.role ?? "") && (
            <Link href="/admin" className="flex items-center gap-4 px-4 py-4 hover:bg-wash/60 transition-colors">
              <span className="w-9 h-9 rounded-xl bg-inv flex items-center justify-center">
                <Bell className="w-[18px] h-[18px] text-white" strokeWidth={1.8} />
              </span>
              <span className="text-[14px] font-medium flex-1">Ops Console</span>
              <span className="text-[12px] text-ink-faint">{user?.role}</span>
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </Link>
          )}
        </div>
        <p className="text-[11px] text-ink-faint text-center mt-6">
          VESPER v2.0 · {unread > 0 ? `${unread} unread notifications` : "You're all caught up"}
        </p>
      </section>
    </div>
  );
}
