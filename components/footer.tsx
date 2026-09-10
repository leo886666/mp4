import Link from "next/link";

const LEGAL = [
  ["terms", "Terms of Service"],
  ["privacy", "Privacy Policy"],
  ["cookies", "Cookies"],
  ["subscription", "Subscription Terms"],
  ["copyright", "Copyright & DMCA"],
  ["community", "Community Guidelines"],
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 hairline-t pt-8 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="font-display text-lg tracking-[0.16em]">VESPER</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-mute">
          <Link href="/discover" className="hover:text-ink transition-colors">Discover</Link>
          <Link href="/vip" className="hover:text-ink transition-colors">Membership</Link>
          <Link href="/studio" className="hover:text-ink transition-colors">Creator Studio</Link>
          <Link href="/design" className="hover:text-ink transition-colors">Design System</Link>
          <Link href="/admin" className="hover:text-ink transition-colors">Ops Console</Link>
        </nav>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-ink-faint">
        {LEGAL.map(([slug, label]) => (
          <Link key={slug} href={`/legal/${slug}`} className="hover:text-ink-mute transition-colors">
            {label}
          </Link>
        ))}
      </div>
      <p className="text-[12px] text-ink-faint mt-4">
        © 2026 VESPER Media. All series, posters and artwork belong to their respective creators.
      </p>
    </footer>
  );
}
