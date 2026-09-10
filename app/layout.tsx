import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/shell";
import { AuthProvider } from "@/lib/auth";
import { themeBootstrapScript } from "@/lib/theme";

/**
 * Typography is loaded at runtime, not at build time.
 *
 * `next/font/google` fetches the font during `next build`, which turns any
 * restricted network (CI, an air-gapped runner, mainland China) into a failed
 * build. A stylesheet link degrades instead: the face arrives if it can, and
 * the fallback stack in globals.css carries the design if it can't.
 * Set NEXT_PUBLIC_WEBFONTS=0 and drop self-hosted files into /public/fonts to
 * remove the third-party request entirely.
 */
const WEBFONTS = process.env.NEXT_PUBLIC_WEBFONTS !== "0";
const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap";

export const metadata: Metadata = {
  title: "VESPER — Stories that fit your night",
  description:
    "Bite-size cinematic dramas. Vertical episodes, binge-ready seasons, one subscription. Watch anywhere.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {WEBFONTS && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={FONT_CSS} />
          </>
        )}
        {/* set the theme before first paint — no flash */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
      </head>
      <body className="font-sans text-ink antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
