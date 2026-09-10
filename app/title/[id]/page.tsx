import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Play, Lock, Star, Eye, ChevronLeft, CalendarDays, Crown } from "@/components/icons";
import { Avatar, Badge, Button, SectionHeader } from "@/components/ui";
import { DramaCard } from "@/components/cards";
import { TitleActions } from "./title-actions";
import { Comments } from "./comments";
import { titleView } from "@/lib/server/services/views";
import { getCreator } from "@/lib/server/repo/ops";
import { optionalUser } from "@/lib/server/session";
import { formatViews, cn } from "@/lib/utils";
import { heroOr } from "@/lib/placeholders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await optionalUser("site");
  let view;
  try {
    view = titleView(id, user);
  } catch {
    notFound();
  }
  const { series, episodes, related, comments, me } = view!;
  const creator = series.creator ? getCreator(series.creator) : null;
  const lockedCount = episodes.filter((e) => e.locked).length;
  const firstFree = episodes.find((e) => !e.locked)?.n ?? 1;
  const resume = episodes.filter((e) => e.progress && !e.progress.completed).sort((a, b) => b.n - a.n)[0];

  return (
    <div className="animate-fade-up">
      <div className="relative h-[300px] sm:h-[380px] lg:h-[440px]">
        <Image src={series.hero || heroOr(null, series.id)} alt="" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-paper via-black/25 to-black/40" />
        <Link
          href="/discover"
          className="absolute top-4 left-4 lg:top-6 lg:left-8 w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center hover:bg-black/55 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 lg:px-8">
        <div className="-mt-28 sm:-mt-32 relative">
          <div className="flex flex-col sm:flex-row gap-5 sm:gap-7">
            <div className="relative w-[132px] sm:w-[190px] shrink-0 aspect-[3/4] rounded-2xl overflow-hidden shadow-lift ring-1 ring-black/10">
              <Image src={series.cover} alt={series.title} fill sizes="190px" className="object-cover" priority />
            </div>

            <div className="pt-14 sm:pt-40 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{series.genreName}</Badge>
                {series.isNew && <Badge tone="ember">NEW</Badge>}
                <Badge tone={series.status === "Ongoing" ? "dark" : "neutral"}>{series.status}</Badge>
                {series.monetization === "ppe" && <Badge tone="gold">${series.ppePrice?.toFixed(2)} / EP</Badge>}
              </div>
              <h1 className="font-display text-[28px] sm:text-[38px] leading-[1.08] tracking-tight mt-3 balance">{series.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <Star className="w-4 h-4 fill-gold text-gold" />
                  {series.rating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="w-4 h-4" strokeWidth={1.8} />
                  {formatViews(series.views)} views
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" strokeWidth={1.8} />
                  {series.updatedLabel}
                </span>
              </div>
            </div>
          </div>

          <TitleActions
            seriesId={series.id}
            firstEpisode={firstFree}
            resumeEpisode={resume ? { n: resume.n, positionS: resume.progress!.positionS } : null}
            initialFavorite={!!me?.favorite}
          />

          <div className="mt-8 grid lg:grid-cols-[1fr_300px] gap-8">
            <div>
              <p className="text-[15px] leading-[1.75] text-ink-soft max-w-[640px]">{series.synopsis}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {series.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/discover?genre=${series.genre}`}
                    className="h-7 px-3 inline-flex items-center rounded-full bg-wash text-[12px] font-medium text-ink-soft hover:bg-line transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            </div>
            {creator && (
              <div className="rounded-2xl ring-1 ring-line p-5 h-fit">
                <p className="text-[12px] font-semibold tracking-wide text-ink-faint uppercase">A series by</p>
                <div className="flex items-center gap-3 mt-3">
                  <Avatar initials={creator.initials} size="md" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold truncate">{creator.name}</p>
                    <p className="text-[12px] text-ink-mute">
                      {creator.followers >= 1000 ? `${(creator.followers / 1000).toFixed(0)}K` : creator.followers} followers · {creator.role}
                    </p>
                  </div>
                </div>
                <Link href="/studio" className="mt-4 block">
                  <Button variant="secondary" size="sm" className="w-full">View studio</Button>
                </Link>
              </div>
            )}
          </div>

          <section className="mt-12">
            <SectionHeader
              title="Episodes"
              sub={`${episodes.length - lockedCount} free · ${lockedCount} locked · ${series.episodes} total`}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {episodes.map((e) => (
                <Link
                  key={e.id}
                  href={`/watch/${series.id}?ep=${e.n}`}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl p-3 ring-1 transition-all",
                    e.locked ? "ring-line bg-wash/60 hover:bg-wash" : "ring-line hover:ring-ink-faint/50 hover:bg-wash"
                  )}
                >
                  <span className="w-9 h-9 rounded-lg bg-paper ring-1 ring-line flex items-center justify-center text-[12px] font-semibold shrink-0">
                    {e.n}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium truncate">{e.title}</span>
                    <span className={cn("block text-[11px] mt-0.5", e.locked ? "text-gold font-medium" : "text-ink-mute")}>
                      {e.locked ? (e.requires === "purchase" ? `$${e.price.toFixed(2)}` : "VIP") : e.duration || "Free"}
                    </span>
                    {e.progress && e.progress.durationS > 0 && (
                      <span className="block mt-1.5 h-[3px] rounded-full bg-line overflow-hidden">
                        <span
                          className="block h-full bg-ember rounded-full"
                          style={{ width: `${Math.min(100, (e.progress.positionS / e.progress.durationS) * 100)}%` }}
                        />
                      </span>
                    )}
                  </span>
                  {e.locked ? (
                    <Lock className="w-4 h-4 text-gold" strokeWidth={2} />
                  ) : (
                    <Play className="w-4 h-4 text-ink-faint group-hover:text-ember transition-colors" />
                  )}
                </Link>
              ))}
            </div>
            {lockedCount > 0 && !me?.vip && (
              <div className="mt-6 rounded-2xl bg-inv text-white p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 fill-gold text-gold shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display text-[18px] leading-snug">Unlock all {series.episodes} episodes</p>
                    <p className="text-[12.5px] text-white/65 mt-1">VIP removes every lock on every series — ad-free, in 4K.</p>
                  </div>
                </div>
                <Button href="/vip" variant="gold" size="md" className="shrink-0">Go VIP</Button>
              </div>
            )}
          </section>

          <Comments seriesId={series.id} initial={comments} />

          <section className="mt-12 pb-8">
            <SectionHeader title="More like this" />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
              {related.map((d) => (
                <DramaCard key={d.id} drama={d} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
