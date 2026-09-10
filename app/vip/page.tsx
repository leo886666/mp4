"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Check, Download, Tv, Zap, ShieldCheck, BadgeCheck, ChevronDown, Loader2 } from "@/components/icons";
import { Button, SectionHeader } from "@/components/ui";
import { VIP_BENEFITS, FAQS } from "@/lib/data";
import { cn, money } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api, track } from "@/lib/client/api";
import type { Plan } from "@/lib/types";

const benefitIcons = [BadgeCheck, ShieldCheck, Zap, Download, Tv, Check];

export default function VipPage() {
  const router = useRouter();
  const { user, subscription, refresh } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<{ valid: boolean; message: string; discount?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.get<{ plans: Plan[] }>("/api/plans").then((res) => {
      setPlans(res.plans);
      setSelected(res.plans.find((p) => p.highlight)?.id ?? res.plans[0]?.id ?? "monthly");
    });
  }, []);

  const plan = plans.find((p) => p.id === selected);
  const discount = couponState?.valid ? couponState.discount ?? 0 : 0;
  const payable = plan ? Math.max(0, plan.price - discount) : 0;

  async function applyCoupon() {
    if (!coupon.trim()) return setCouponState(null);
    try {
      const res = await api.post<any>("/api/coupons/validate", { code: coupon.trim(), planId: selected });
      setCouponState(res.valid ? { valid: true, message: `−${money(res.discount)} applied`, discount: res.discount } : { valid: false, message: res.reason });
    } catch (e: any) {
      setCouponState({ valid: false, message: e?.message ?? "Invalid code" });
    }
  }

  async function subscribe() {
    if (!user) return router.push("/register?next=/vip");
    if (!plan) return;
    setBusy(true);
    setError(null);
    track("checkout_started", { props: { planId: plan.id } });
    try {
      const res = await api.post<{ checkoutUrl: string }>("/api/orders", {
        kind: "subscription",
        planId: plan.id,
        couponCode: couponState?.valid ? coupon.trim() : undefined,
      });
      router.push(res.checkoutUrl);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't start checkout");
      setBusy(false);
    }
  }

  async function cancelRenew() {
    setBusy(true);
    await api.post("/api/me/subscription", { action: subscription?.autoRenew ? "cancel" : "resume" }).catch(() => {});
    await refresh();
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-6 lg:pt-10 animate-fade-up">
      <div className="text-center max-w-[560px] mx-auto">
        <span className="inline-flex items-center gap-1.5 h-7 px-3.5 rounded-full bg-gold-tint text-gold text-[12px] font-semibold tracking-wide">
          <Crown className="w-4 h-4 fill-gold" />
          VESPER VIP
        </span>
        <h1 className="font-display text-[34px] lg:text-[44px] leading-[1.05] tracking-tight mt-4 balance">
          Every story. Every episode. One pass.
        </h1>
        <p className="text-[15px] text-ink-mute mt-3 leading-relaxed">
          Unlimited streaming of the entire catalog, ad-free, with early access to new episodes.
        </p>
      </div>

      {user?.vip && subscription && (
        <div className="mt-8 max-w-[880px] mx-auto rounded-2xl bg-inv text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <Crown className="w-7 h-7 fill-gold text-gold shrink-0" />
          <div className="flex-1">
            <p className="font-display text-[20px] leading-snug">VIP is active</p>
            <p className="text-[13px] text-white/65 mt-1">
              Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()} ·{" "}
              {subscription.autoRenew ? "auto-renew on" : "auto-renew off — access ends at period end"}
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={cancelRenew} disabled={busy} className="!text-ink shrink-0">
            {subscription.autoRenew ? "Turn off auto-renew" : "Turn auto-renew back on"}
          </Button>
        </div>
      )}

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-[880px] mx-auto">
        {plans.map((p) => {
          const active = selected === p.id;
          return (
            <button
              key={p.id}
              onClick={() => { setSelected(p.id); setCouponState(null); }}
              className={cn(
                "relative text-left rounded-2xl p-4 sm:p-5 ring-1 transition-all",
                active ? "ring-ink bg-inv text-white scale-[1.02] shadow-lift" : "ring-line bg-paper hover:ring-ink-faint/40"
              )}
            >
              {p.badge && (
                <span className={cn(
                  "absolute -top-2.5 left-4 h-5 px-2 inline-flex items-center rounded-full text-[10px] font-bold tracking-wide",
                  active ? "bg-gold text-white" : "bg-gold-tint text-gold"
                )}>
                  {p.badge.toUpperCase()}
                </span>
              )}
              <p className={cn("text-[13px] font-semibold", active ? "text-white/80" : "text-ink-mute")}>{p.name}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-[28px] sm:text-[32px] tracking-tight leading-none">{money(p.price)}</span>
                <span className={cn("text-[12px]", active ? "text-white/60" : "text-ink-faint")}>/{p.period}</span>
              </p>
              {p.perMonth && <p className={cn("text-[11px] mt-1.5", active ? "text-white/70" : "text-ink-mute")}>≈ {money(p.perMonth)}/mo</p>}
              {p.savings && <p className="text-[11px] mt-0.5 font-medium text-gold">{p.savings}</p>}
              <span className={cn("absolute top-4 right-4 w-5 h-5 rounded-full flex items-center justify-center transition-all", active ? "bg-paper" : "ring-1 ring-line")}>
                {active && <Check className="w-3 h-3 text-ink" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 max-w-[880px] mx-auto rounded-2xl ring-1 ring-line p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <p className="text-[14px] font-semibold">VESPER VIP — {plan?.name ?? "…"}</p>
            <p className="text-[12px] text-ink-mute mt-1">
              {plan ? `${money(payable)} billed per ${plan.period}` : "Loading plans…"} · auto-renews · cancel anytime
              {discount > 0 && <span className="text-ember font-medium"> · saved {money(discount)}</span>}
            </p>
          </div>
          <Button variant="gold" size="lg" className="w-full sm:w-auto min-w-[210px]" onClick={subscribe} disabled={busy || !plan}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4 fill-white" />}
            {user?.vip ? `Extend — ${money(payable)}` : `Subscribe — ${money(payable)}`}
          </Button>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            onBlur={applyCoupon}
            placeholder="Promo code (try WELCOME50)"
            className="h-10 px-4 rounded-full bg-wash ring-1 ring-line text-[13px] outline-none focus:ring-ink-faint transition-shadow sm:w-[280px]"
          />
          <button onClick={applyCoupon} className="h-10 px-4 rounded-full text-[13px] font-medium text-ink-mute hover:text-ink transition-colors">Apply</button>
          {couponState && (
            <span className={cn("text-[12.5px] font-medium", couponState.valid ? "text-emerald-600" : "text-ember")}>{couponState.message}</span>
          )}
        </div>
        {error && <p className="text-[12.5px] text-ember mt-3">{error}</p>}
      </div>
      <p className="text-center text-[11px] text-ink-faint mt-3">
        Checkout runs through the configured gateway. Cancel any time from your profile.
      </p>

      <section className="mt-16">
        <SectionHeader title="What VIP unlocks" sub="Six reasons members stay" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VIP_BENEFITS.map((b, i) => {
            const Icon = benefitIcons[i] ?? Check;
            return (
              <div key={b.title} className="rounded-2xl ring-1 ring-line p-5 hover:ring-ink-faint/40 transition-shadow">
                <span className="w-9 h-9 rounded-xl bg-wash flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-ink-soft" strokeWidth={1.8} />
                </span>
                <h3 className="text-[15px] font-semibold mt-3.5">{b.title}</h3>
                <p className="text-[13px] text-ink-mute mt-1 leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeader title="Free vs VIP" />
        <div className="rounded-2xl ring-1 ring-line overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-wash text-left">
                <th className="font-medium text-ink-mute px-5 py-3.5"> </th>
                <th className="font-medium text-ink-mute px-5 py-3.5">Free</th>
                <th className="font-semibold px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 fill-gold text-gold" /> VIP</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Catalog access", "First episodes only", "Everything, always"],
                ["Ads", "Between episodes", "None"],
                ["New episodes", "72h later", "Day one"],
                ["Offline downloads", "—", "Unlimited"],
                ["Streaming quality", "720p", "Up to 4K"],
              ].map((row) => (
                <tr key={row[0]}>
                  <td className="px-5 py-3.5 font-medium">{row[0]}</td>
                  <td className="px-5 py-3.5 text-ink-mute">{row[1]}</td>
                  <td className="px-5 py-3.5 font-medium">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14 pb-12">
        <SectionHeader title="Questions, answered" />
        <div className="max-w-[720px] divide-y divide-line rounded-2xl ring-1 ring-line overflow-hidden">
          {FAQS.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-wash/60 transition-colors"
              >
                <span className="text-[14px] font-medium">{f.q}</span>
                <ChevronDown className={cn("w-4 h-4 text-ink-faint transition-transform shrink-0", openFaq === i && "rotate-180")} />
              </button>
              {openFaq === i && <p className="px-5 pb-4 text-[13px] text-ink-mute leading-relaxed">{f.a}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
