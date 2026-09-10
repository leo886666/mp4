"use client";

import {
  Play, Star, Heart, Lock, Crown, Download, Bell, Share2, Search, Home,
} from "@/components/icons";
import {
  Button, Chip, Badge, Avatar, Rating, SectionHeader, Skeleton, EmptyState,
  Segmented, Progress,
} from "@/components/ui";

function Row({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="mt-12">
      <div className="hairline-b pb-2 mb-6">
        <h2 className="text-[13px] font-semibold tracking-widest uppercase text-ink-faint">{title}</h2>
        {note && <p className="text-[12px] text-ink-faint mt-1">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <div className="mx-auto max-w-[880px] px-5 lg:px-8 pt-6 lg:pt-10 pb-16 animate-fade-up">
      <p className="text-[12px] font-semibold tracking-widest uppercase text-ember">V1 · September 2026</p>
      <h1 className="font-display text-[36px] lg:text-[44px] tracking-tight mt-2">VESPER Design System</h1>
      <p className="text-[15px] text-ink-mute mt-3 leading-relaxed max-w-[560px]">
        The single source of truth for VESPER product surface: tokens, type, and the component kit.
        Everything on this page maps 1:1 to Tailwind tokens — build new pages from these parts.
      </p>

      <Row title="Foundations — color" note="Paper-first. Ink for authority. Ember strictly as accent (≤5% of any screen).">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            ["Paper", "var(--surface)", "bg-paper ring-1 ring-line"],
            ["Wash", "var(--surface2)", "bg-wash ring-1 ring-line"],
            ["Line", "var(--line)", "bg-line"],
            ["Ink", "var(--ink)", "bg-inv"],
            ["Ember", "var(--ember)", "bg-ember"],
            ["Gold", "#B98A2F", "bg-gold"],
          ].map(([name, hex, cls]) => (
            <div key={name}>
              <div className={`h-16 rounded-xl ${cls}`} />
              <p className="text-[12px] font-medium mt-2">{name}</p>
              <p className="text-[11px] text-ink-faint">{hex}</p>
            </div>
          ))}
        </div>
      </Row>

      <Row title="Type scale" note="Playfair Display for display moments; Inter for everything else.">
        <div className="space-y-4">
          <p className="font-display text-[44px] leading-none tracking-tight">Display 44 — Playfair</p>
          <p className="font-display text-[28px] leading-none tracking-tight">Display 28 — card titles</p>
          <p className="text-[15px] font-medium">Body strong 15 / Inter Medium</p>
          <p className="text-[15px] text-ink-soft">Body 15 / Inter Regular — synopsis and long copy</p>
          <p className="text-[13px] text-ink-mute">Caption 13 — metadata, subtitles</p>
          <p className="text-[11px] text-ink-faint">Micro 11 — badges, legal</p>
        </div>
      </Row>

      <Row title="Buttons" note="Primary = ember pill. One per view. Dark = neutral authority. Gold = VIP only.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="dark">Dark</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="gold"><Crown className="w-4 h-4 fill-white" />VIP</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Row>

      <Row title="Chips, badges & tags">
        <div className="flex flex-wrap items-center gap-2.5">
          <Chip active>Active chip</Chip>
          <Chip>Default chip</Chip>
          <Badge>Neutral</Badge>
          <Badge tone="ember">NEW</Badge>
          <Badge tone="gold">VIP</Badge>
          <Badge tone="dark">Ongoing</Badge>
          <Rating value={9.4} />
        </div>
      </Row>

      <Row title="Icons" note="Lucide, 1.8 stroke, 20/22px. Never emoji.">
        <div className="flex flex-wrap gap-4">
          {[Play, Star, Heart, Lock, Crown, Download, Bell, Share2, Search, Home].map((I, i) => (
            <span key={i} className="w-11 h-11 rounded-xl bg-wash ring-1 ring-line flex items-center justify-center">
              <I className="w-5 h-5 text-ink-soft" strokeWidth={1.8} />
            </span>
          ))}
        </div>
      </Row>

      <Row title="Avatars">
        <div className="flex items-center gap-4">
          <Avatar initials="ES" size="sm" />
          <Avatar initials="GL" size="md" />
          <Avatar initials="MH" size="lg" />
        </div>
      </Row>

      <Row title="Feedback — skeleton & empty" note="Honest empty states only. Never fake data.">
        <div className="grid sm:grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="rounded-2xl ring-1 ring-line">
            <EmptyState
              icon={<Star className="w-6 h-6" strokeWidth={1.6} />}
              title="Nothing here yet"
              desc="Empty states explain why, and offer the next step."
            />
          </div>
        </div>
      </Row>

      <Row title="Controls">
        <div className="space-y-5">
          <Segmented
            options={[{ id: "a", label: "Trending" }, { id: "b", label: "New" }, { id: "c", label: "Top" }]}
            value="a"
            onChange={() => {}}
          />
          <div className="max-w-[320px] rounded-full bg-black/70 p-2">
            <Progress value={38} />
          </div>
        </div>
      </Row>

      <Row title="Layout rules" note="Mobile-first. 390px baseline. Desktop adds a 240px sidebar at ≥1024px.">
        <ul className="space-y-2.5 text-[14px] text-ink-soft max-w-[560px]">
          <li>· Cover ratio is always 3:4. Player is always 9:16.</li>
          <li>· Cards carry a 1px #EFEFF2 ring — never bare images.</li>
          <li>· Spacing rhythm: 4 / 8 / 12 / 16 / 24 / 32 / 48. Never mt-1.</li>
          <li>· Corner radius: cards 14px, sheets 20px, pills full.</li>
          <li>· One primary action per screen; everything else is secondary or ghost.</li>
        </ul>
      </Row>
    </div>
  );
}
