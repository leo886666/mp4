"use client";

import { useEffect, useState } from "react";
import { Heart } from "@/components/icons";
import { Button, EmptyState } from "@/components/ui";
import { DramaCard } from "@/components/cards";
import { api } from "@/lib/client/api";
import { useAuth } from "@/lib/auth";
import type { Drama, Paged } from "@/lib/types";

export default function FavoritesPage() {
  const { user, ready } = useAuth();
  const [items, setItems] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void api
      .get<Paged<Drama>>("/api/me/favorites")
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [ready, user]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-6 lg:pt-10 animate-fade-up">
      <h1 className="font-display text-[30px] lg:text-[36px] tracking-tight">My list</h1>
      <p className="text-[14px] text-ink-mute mt-1.5">{items.length} series saved</p>

      {!user && ready ? (
        <EmptyState
          icon={<Heart className="w-6 h-6" strokeWidth={1.6} />}
          title="Your list lives with your account"
          desc="Sign up free and save any series with one tap."
          action={<Button href="/register?next=/me/favorites">Sign up free</Button>}
        />
      ) : loading ? (
        <div className="mt-7 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-card bg-wash animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-6 h-6" strokeWidth={1.6} />}
          title="Nothing saved yet"
          desc="Tap “Add to list” on any series and it shows up here."
          action={<Button href="/discover">Browse the catalog</Button>}
        />
      ) : (
        <div className="mt-7 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
          {items.map((d, i) => <DramaCard key={d.id} drama={d} priority={i < 6} />)}
        </div>
      )}
      <div className="pb-10" />
    </div>
  );
}
