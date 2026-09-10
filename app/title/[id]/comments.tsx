"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button } from "@/components/ui";
import { Crown, Heart } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/client/api";
import type { CommentItem } from "@/lib/types";

function ago(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function Comments({ seriesId, initial }: { seriesId: string; initial: CommentItem[] }) {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!user) return router.push(`/register?next=/title/${seriesId}`);
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ comment: CommentItem }>(`/api/series/${seriesId}/comments`, { body: text });
      setItems((prev) => [res.comment, ...prev]);
      setBody("");
    } catch (e: any) {
      setError(e?.message ?? "Couldn't post that");
    } finally {
      setBusy(false);
    }
  }

  async function like(id: string) {
    if (!user) return router.push(`/login?next=/title/${seriesId}`);
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c)));
    await api.post(`/api/comments/${id}/like`).catch(() => {});
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-[22px] leading-tight tracking-tight mb-4">
        Comments <span className="text-ink-faint text-[15px] font-sans">{items.length}</span>
      </h2>

      <div className="flex gap-3">
        <Avatar initials={user?.initials ?? "?"} size="md" />
        <div className="flex-1 min-w-0">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={user ? "What did you think?" : "Sign in to join the conversation"}
            rows={2}
            maxLength={500}
            className="w-full rounded-xl bg-wash ring-1 ring-line px-4 py-3 text-[14px] resize-none outline-none focus:ring-ink-faint transition-shadow"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11.5px] text-ink-faint">{error ?? `${body.length}/500`}</span>
            <Button size="sm" onClick={submit} disabled={busy || !body.trim()}>
              {busy ? "Posting…" : user ? "Post" : "Sign in to post"}
            </Button>
          </div>
        </div>
      </div>

      <ul className="mt-6 divide-y divide-line">
        {items.map((c) => (
          <li key={c.id} className="py-4 flex gap-3">
            <Avatar initials={c.user.initials} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold flex items-center gap-1.5">
                {c.user.name}
                {c.user.vip && <Crown className="w-3.5 h-3.5 fill-gold text-gold" />}
                <span className="text-ink-faint font-normal">· {ago(c.createdAt)}</span>
              </p>
              <p className="text-[14px] text-ink-soft leading-relaxed mt-1">{c.body}</p>
            </div>
            <button
              onClick={() => like(c.id)}
              className="shrink-0 h-fit inline-flex items-center gap-1 text-[12px] text-ink-faint hover:text-ember transition-colors"
            >
              <Heart className="w-3.5 h-3.5" strokeWidth={1.8} />
              {c.likes || ""}
            </button>
          </li>
        ))}
        {!items.length && <li className="py-10 text-center text-[13px] text-ink-faint">Be the first to say something.</li>}
      </ul>
    </section>
  );
}
