import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ShieldCheck } from "@/components/icons";
import { LEGAL_DOCS, legalBySlug } from "@/lib/legal";

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ slug: d.slug }));
}

export default async function LegalPage({ params }: { params: { slug: string } }) {
  const doc = legalBySlug(params.slug);
  if (!doc) notFound();
  return (
    <div className="mx-auto max-w-[720px] px-5 pt-6 lg:pt-10 pb-16 animate-fade-up">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-mute hover:text-ink transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Home
      </Link>
      <div className="mt-5 flex items-center gap-2 text-[12px] font-semibold tracking-widest uppercase text-ember">
        <ShieldCheck className="w-4 h-4" strokeWidth={2} />
        Legal
      </div>
      <h1 className="font-display text-[32px] lg:text-[38px] tracking-tight mt-2">{doc.title}</h1>
      <p className="text-[12px] text-ink-faint mt-2">Last updated: {doc.updated}</p>
      <p className="text-[15px] leading-[1.75] text-ink-soft mt-5">{doc.intro}</p>

      <div className="mt-8 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-[17px] font-semibold tracking-tight">{s.h}</h2>
            {s.p.map((p, i) => (
              <p key={i} className="text-[14px] leading-[1.8] text-ink-soft mt-3">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="mt-12 pt-6 hairline-t">
        <p className="text-[12px] text-ink-faint">Other documents</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
          {LEGAL_DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
            <Link
              key={d.slug}
              href={`/legal/${d.slug}`}
              className="text-[13px] font-medium text-ink-soft hover:text-ink transition-colors"
            >
              {d.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
