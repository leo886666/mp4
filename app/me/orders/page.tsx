"use client";

import { useEffect, useState } from "react";
import { Wallet } from "@/components/icons";
import { Button, EmptyState } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAuth } from "@/lib/auth";
import { cn, money } from "@/lib/utils";
import type { Paged } from "@/lib/types";

interface OrderRow {
  id: string; title: string; kind: string; amount: number; currency: string;
  status: string; gateway: string; createdAt: number; paidAt: number | null;
}

const TONE: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-gold-tint text-gold",
  refunded: "bg-ember-tint text-ember",
  failed: "bg-ember-tint text-ember",
  canceled: "bg-wash text-ink-mute",
};

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!user) return setLoading(false);
    void api
      .get<Paged<OrderRow>>("/api/me/orders?perPage=50")
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [ready, user]);

  return (
    <div className="mx-auto max-w-[900px] px-5 lg:px-8 pt-6 lg:pt-10 animate-fade-up">
      <h1 className="font-display text-[30px] lg:text-[36px] tracking-tight">Orders & receipts</h1>
      <p className="text-[14px] text-ink-mute mt-1.5">Every charge on your account, in one place.</p>

      {!user && ready ? (
        <EmptyState icon={<Wallet className="w-6 h-6" strokeWidth={1.6} />} title="Sign in to see your receipts" action={<Button href="/login?next=/me/orders">Log in</Button>} />
      ) : loading ? (
        <div className="mt-7 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-wash animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Wallet className="w-6 h-6" strokeWidth={1.6} />} title="No orders yet" desc="Your VIP and unlock receipts will appear here." action={<Button href="/vip">See membership</Button>} />
      ) : (
        <div className="mt-7 rounded-2xl ring-1 ring-line overflow-hidden divide-y divide-line">
          {items.map((o) => (
            <div key={o.id} className="flex items-center gap-4 px-4 py-4 hover:bg-wash/50 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium truncate">{o.title}</p>
                <p className="text-[12px] text-ink-mute mt-0.5 tabular-nums">
                  {new Date(o.paidAt ?? o.createdAt).toLocaleString()} · {o.gateway} · {o.id}
                </p>
              </div>
              <span className={cn("h-6 px-2.5 inline-flex items-center rounded-full text-[11px] font-semibold shrink-0", TONE[o.status] ?? "bg-wash text-ink-mute")}>
                {o.status}
              </span>
              <span className="font-display text-[18px] tabular-nums w-20 text-right shrink-0">{money(o.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="pb-10" />
    </div>
  );
}
