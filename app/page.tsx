import Link from "next/link";
import { Flame, Sparkles, Trophy } from "@/components/icons";
import { HeroCarousel } from "@/components/hero-carousel";
import { ContinueWatching } from "@/components/continue-watching";
import { SectionHeader } from "@/components/ui";
import { DramaCard, DramaRail, RankedList } from "@/components/cards";
import { SiteFooter } from "@/components/footer";
import { homeView } from "@/lib/server/services/views";
import { genres } from "@/lib/server/repo/catalog";
import { optionalUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-rendered from the database — same read model the REST API serves. */
export default async function HomePage() {
  const user = await optionalUser("site");
  const home = homeView(user);
  const allGenres = genres();
  const top10a = home.top10.slice(0, 5);
  const top10b = home.top10.slice(5, 10);
  const editors = home.rails.find((r) => r.kind === "manual")?.items ?? home.fresh.slice(0, 6);

  return (
    <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-4 lg:pt-8">
      <section className="animate-fade-up">
        <HeroCarousel slides={home.hero as any} linkTo="watch" />
      </section>

      <ContinueWatching items={home.continueWatching} />

      {/* genre chips */}
      <section className="mt-10">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0">
          {allGenres.map((g) => (
            <Link
              key={g.id}
              href={`/discover?genre=${g.id}`}
              className="h-8 px-3.5 inline-flex items-center rounded-full text-[13px] font-medium bg-paper text-ink-soft border border-line hover:border-ink-faint hover:text-ink transition-colors whitespace-nowrap"
            >
              {g.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Top 10 this week" sub="What everyone is bingeing right now" action="See all" href="/discover" />
        <div className="grid lg:grid-cols-2 gap-x-10">
          <RankedList dramas={top10a} linkTo="watch" />
          <RankedList dramas={top10b} offset={5} linkTo="watch" />
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader title="New & noteworthy" sub="Fresh drops from our studios" action="Discover" href="/discover" />
        <DramaRail dramas={home.fresh} linkTo="watch" />
      </section>

      <section className="mt-12">
        <SectionHeader title="Editors' picks" sub="Hand-selected by our curation team" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6 cv-auto">
          {editors.slice(0, 6).map((d, i) => (
            <DramaCard key={d.id} drama={d} priority={i < 6} linkTo="watch" />
          ))}
        </div>
      </section>

      {home.rails
        .filter((r) => r.kind !== "manual" && r.items.length > 0)
        .map((rail) => (
          <section key={rail.id} className="mt-12">
            <SectionHeader title={rail.title} sub={rail.subtitle ?? undefined} action="See all" href={rail.href} />
            <DramaRail dramas={rail.items} linkTo="watch" />
          </section>
        ))}

      <section className="mt-12">
        <SectionHeader title="Browse by mood" sub="Find your next obsession" action="All genres" href="/discover" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/discover?genre=revenge", title: "Revenge served cold", icon: Flame },
            { href: "/discover?genre=billionaire", title: "Rich, brooding, mine", icon: Trophy },
            { href: "/discover?genre=supernatural", title: "After midnight", icon: Sparkles },
            { href: "/discover?genre=romance", title: "Falling, slowly", icon: Flame },
          ].map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="group relative rounded-2xl overflow-hidden ring-1 ring-line bg-wash p-5 h-32 flex flex-col justify-end hover:ring-ink-faint/40 transition-shadow"
            >
              <t.icon className="absolute top-4 right-4 w-5 h-5 text-ink-faint group-hover:text-ember transition-colors" strokeWidth={1.6} />
              <p className="font-display text-[19px] leading-snug tracking-tight max-w-[160px]">{t.title}</p>
              <p className="text-[12px] text-ink-mute mt-1">Explore →</p>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
