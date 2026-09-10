import { NextResponse } from "next/server";
import { clientIp, route } from "@/lib/server/http";
import { verify } from "@/lib/server/crypto";
import { createUser, findByEmail } from "@/lib/server/repo/users";
import { createSession, setSessionCookie } from "@/lib/server/session";
import { track } from "@/lib/server/repo/stats";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lands from the magic link: verify, create the session, bounce to `next`. */
export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const claims = verify<{ kind: string; email: string; next?: string }>(url.searchParams.get("t") || "");
  if (!claims || claims.kind !== "signin") {
    return NextResponse.redirect(`${env.siteUrl}/login?error=link_expired`, 302);
  }

  const user =
    findByEmail(claims.email) ??
    createUser({
      email: claims.email,
      name: claims.email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40),
      channel: "email",
    });

  const { token, expiresAt } = createSession(user.id, "site", { ip: clientIp(req), ua: req.headers.get("user-agent") ?? undefined });
  track("session_start", { userId: user.id, props: { provider: "email-link" } });

  const target = claims.next && claims.next.startsWith("/") ? claims.next : "/";
  return setSessionCookie(NextResponse.redirect(`${env.siteUrl}${target}`, 302), token, "site", expiresAt);
});
