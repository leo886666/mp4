"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Crown, Lock, Loader2, ShieldCheck, X } from "@/components/icons";
import { Button } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAuth } from "@/lib/auth";
import { cn, money } from "@/lib/utils";

interface OrderView {
  order: {
    id: string; kind: string; title: string; amount: number; discount: number;
    currency: string; status: string; gateway: string; couponCode: string | null; createdAt: number;
    plan: { id: string; name: string; period: string } | null;
  };
  confirmToken: string | null;
}

const METHODS = [
  { id: "card", label: "Card", hint: "Visa · Mastercard · Amex" },
  { id: "apple", label: "Apple Pay", hint: "Face ID" },
  { id: "google", label: "Google Pay", hint: "One tap" },
];

/**
 * Hosted checkout.
 *
 * With VESPER_PAYMENT_GATEWAY=stripe this page never renders — the order API
 * hands back Stripe's own URL. On the mock gateway it stands in for the PSP:
 * it posts the signed confirmation, which flows through the same webhook path.
 */
export default function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();

  const [view, setView] = useState<OrderView | null>(null);
  const [method, setMethod] = useState("card");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"paid" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<OrderView>(`/api/orders/${orderId}`)
      .then((res) => {
        setView(res);
        if (res.order.status === "paid") setDone("paid");
      })
      .catch((e) => setError(e.message));
  }, [orderId]);

  async function pay(outcome: "succeeded" | "failed") {
    if (!view?.confirmToken) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/payments/mock/confirm", { token: view.confirmToken, outcome, method });
      await refresh();
      setDone(outcome === "succeeded" ? "paid" : "failed");
    } catch (e: any) {
      setError(e?.message ?? "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !view) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center">
          <p className="font-display text-2xl">Order unavailable</p>
          <p className="text-[13px] text-ink-mute mt-2">{error}</p>
          <Button href="/vip" className="mt-6">Back to membership</Button>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
      </div>
    );
  }

  const { order } = view;

  return (
    <div className="min-h-screen bg-wash flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="font-display text-xl tracking-[0.18em]">VESPER</Link>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-mute">
            <Lock className="w-3.5 h-3.5" /> Secure checkout
          </span>
        </div>

        <div className="rounded-2xl bg-paper ring-1 ring-line overflow-hidden">
          {done === "paid" ? (
            <div className="p-8 text-center">
              <span className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-7 h-7" strokeWidth={2.5} />
              </span>
              <h1 className="font-display text-[24px] mt-4">Payment complete</h1>
              <p className="text-[13.5px] text-ink-mute mt-2 leading-relaxed">
                {order.kind === "subscription" ? "VIP is active on your account." : "Your unlock is ready."}
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button href={order.kind === "subscription" ? "/" : "/me/orders"} size="lg">Start watching</Button>
                <Button href="/me/orders" variant="ghost" size="md">View receipt</Button>
              </div>
            </div>
          ) : done === "failed" ? (
            <div className="p-8 text-center">
              <span className="w-14 h-14 rounded-full bg-ember-tint text-ember flex items-center justify-center mx-auto">
                <X className="w-7 h-7" strokeWidth={2.5} />
              </span>
              <h1 className="font-display text-[24px] mt-4">Payment declined</h1>
              <p className="text-[13.5px] text-ink-mute mt-2">No charge was made. You can try a different method.</p>
              <Button onClick={() => setDone(null)} className="mt-6" size="lg">Try again</Button>
            </div>
          ) : (
            <>
              <div className="p-6 hairline-b">
                <p className="text-[12px] font-semibold tracking-widest text-ink-faint uppercase">Order summary</p>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-[15px] font-semibold">{order.title}</span>
                  <span className="font-display text-[24px] tabular-nums">{money(order.amount)}</span>
                </div>
                {order.discount > 0 && (
                  <p className="text-[12px] text-emerald-600 mt-1">Promo {order.couponCode} · −{money(order.discount)}</p>
                )}
                <p className="text-[12px] text-ink-mute mt-1">
                  Order {order.id} · {order.gateway} · {order.currency}
                </p>
              </div>

              <div className="p-6">
                <p className="text-[12px] font-semibold tracking-widest text-ink-faint uppercase mb-3">Payment method</p>
                <div className="space-y-2">
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl px-4 py-3 ring-1 text-left transition-all",
                        method === m.id ? "ring-ink bg-wash" : "ring-line hover:ring-ink-faint/50"
                      )}
                    >
                      <span className={cn("w-4 h-4 rounded-full flex items-center justify-center shrink-0", method === m.id ? "bg-inv" : "ring-1 ring-line")}>
                        {method === m.id && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
                      </span>
                      <span className="flex-1">
                        <span className="block text-[14px] font-medium">{m.label}</span>
                        <span className="block text-[11.5px] text-ink-faint">{m.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {error && <p className="text-[12.5px] text-ember mt-4">{error}</p>}

                <Button variant="gold" size="lg" className="w-full mt-5" onClick={() => pay("succeeded")} disabled={busy}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4 fill-white" />}
                  Pay {money(order.amount)}
                </Button>
                <button
                  onClick={() => pay("failed")}
                  disabled={busy}
                  className="w-full mt-2 h-9 text-[12px] text-ink-faint hover:text-ink-mute transition-colors"
                >
                  Simulate a declined card
                </button>
                <p className="text-[11px] text-ink-faint text-center mt-4 leading-relaxed inline-flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px" />
                  Sandbox gateway — set VESPER_PAYMENT_GATEWAY=stripe to route this order to a live PSP.
                </p>
              </div>
            </>
          )}
        </div>

        <button onClick={() => router.back()} className="w-full mt-4 h-9 text-[12.5px] text-ink-mute hover:text-ink transition-colors">
          Cancel and go back
        </button>
      </div>
    </div>
  );
}
