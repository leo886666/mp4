import { NextResponse } from "next/server";
import { badRequest, body, clientIp, ok, oneOf, route, str } from "@/lib/server/http";
import { insert, get, now } from "@/lib/server/db";
import { newId } from "@/lib/server/ids";
import { createUser, findByEmail, findById, toPublic } from "@/lib/server/repo/users";
import { createSession, setSessionCookie } from "@/lib/server/session";
import { track } from "@/lib/server/repo/stats";
import { notify } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDERS = ["google", "x", "telegram"] as const;

/**
 * OAuth exchange endpoint.
 *
 * In production this receives the provider's authorization code, exchanges it
 * server-side and reads the verified profile. The local adapter accepts the
 * profile directly so the whole sign-in -> session -> entitlement chain is
 * exercised without external credentials. Swap `resolveProfile` only.
 */
async function resolveProfile(provider: string, data: Record<string, any>) {
  // TODO(production): exchange data.code at the provider's token endpoint.
  const handle = str(data.handle, "handle", { optional: true }) || "viewer";
  const fallbackEmail: Record<string, string> = {
    google: `${handle}@gmail.com`,
    x: `${handle}@x.com`,
    telegram: `${handle}@telegram.me`,
  };
  return {
    uid: str(data.uid, "uid", { optional: true }) || `${provider}_${handle}`,
    email: (str(data.email, "email", { optional: true }) || fallbackEmail[provider]).toLowerCase(),
    name: str(data.name, "name", { optional: true }) || `${provider === "x" ? "X" : provider === "telegram" ? "TG" : "Google"} Viewer`,
  };
}

export const POST = route(async (req: Request, { params }: { params: { provider: string } }) => {
  const provider = oneOf(params.provider, "provider", PROVIDERS);
  const data = await body(req).catch(() => ({}) as Record<string, any>);
  const profile = await resolveProfile(provider, data);
  if (!profile.email) throw badRequest("Provider did not return an email");

  const link = get<{ user_id: string }>("SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_uid = ?", provider, profile.uid);
  let user = link ? findById(link.user_id) : findByEmail(profile.email);

  if (!user) {
    user = createUser({ email: profile.email, name: profile.name, channel: `oauth:${provider}` });
    track("sign_up", { userId: user.id, props: { provider } });
    notify({ userId: user.id, kind: "welcome", title: "Welcome to VESPER", body: "Pick up any series — the first episodes are free.", link: "/discover" });
  }
  if (!link) {
    insert("oauth_accounts", { id: newId("oa"), user_id: user.id, provider, provider_uid: profile.uid, email: profile.email, created_at: now() });
  }

  const { token, expiresAt } = createSession(user.id, "site", { ip: clientIp(req), ua: req.headers.get("user-agent") ?? undefined });
  track("session_start", { userId: user.id, props: { provider } });
  const res = ok({ user: toPublic(user), provider }) as NextResponse;
  return setSessionCookie(res, token, "site", expiresAt);
});
