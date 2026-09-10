import { NextResponse } from "next/server";
import { body, clientIp, email as emailOf, forbidden, ok, route, str, unauthorized } from "@/lib/server/http";
import { hashPassword, sign, verifyPassword } from "@/lib/server/crypto";
import { createUser, findByEmail, toPublic } from "@/lib/server/repo/users";
import { createSession, setSessionCookie } from "@/lib/server/session";
import { getSetting } from "@/lib/server/repo/ops";
import { isStaff } from "@/lib/server/rbac";
import { track } from "@/lib/server/repo/stats";
import { notify } from "@/lib/server/notify";
import { audit } from "@/lib/server/audit";
import { deliver, signInMail } from "@/lib/server/mail";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email as a sign-in provider — one field, same weight as Google / X / Telegram.
 *
 * An unknown address creates the account and signs in. A known address that has
 * a password (every staff account does) can never be claimed by typing it: the
 * response asks for the password instead. With VESPER_EMAIL_SIGNIN=link a signed
 * 15-minute link is mailed before any session exists.
 */
export const POST = route(async (req: Request) => {
  const data = await body(req);
  const address = emailOf(data.email);
  const password = str(data.password, "password", { optional: true, trim: false });
  const next = str(data.next, "next", { optional: true, max: 300 }) || "/";

  const existing = findByEmail(address);

  // Accounts with a password — and all staff — must prove it.
  if (existing && (existing.password_hash || isStaff(existing.role))) {
    if (!password) {
      return ok({ requiresPassword: true, name: existing.name, initials: existing.initials });
    }
    if (!verifyPassword(password, existing.password_hash)) throw unauthorized("That password doesn't match");
    if (existing.status !== "active") throw forbidden("This account is suspended");
    const { token, expiresAt } = createSession(existing.id, "site", { ip: clientIp(req), ua: req.headers.get("user-agent") ?? undefined });
    track("session_start", { userId: existing.id, props: { provider: "email" } });
    return setSessionCookie(ok({ user: toPublic(existing) }) as NextResponse, token, "site", expiresAt);
  }

  if (!existing && !getSetting<boolean>("site.registrationOpen")) {
    throw forbidden("Registration is temporarily closed");
  }

  // Passwordless path.
  if (env.emailSignin === "link") {
    const linkToken = sign({ kind: "signin", email: address, next }, env.emailLinkSeconds);
    const url = `${env.siteUrl}/api/auth/email/verify?t=${encodeURIComponent(linkToken)}`;
    const result = await deliver(signInMail(address, url));
    return ok({
      sent: true,
      email: address,
      // no mail provider wired up yet → surface the link so the flow is still testable
      devLink: result.sent ? undefined : url,
    });
  }

  const user =
    existing ??
    createUser({
      email: address,
      name: address.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40),
      channel: "email",
    });

  if (!existing) {
    track("sign_up", { userId: user.id, props: { provider: "email" } });
    notify({ userId: user.id, kind: "welcome", title: "Welcome to VESPER", body: "The first episodes of every series are on us.", link: "/discover" });
    audit({ actorId: user.id, actorName: user.name, action: "user.register", targetType: "user", targetId: user.id, detail: { provider: "email" }, ip: clientIp(req) });
  }
  if (user.status !== "active") throw forbidden("This account is suspended");

  const { token, expiresAt } = createSession(user.id, "site", { ip: clientIp(req), ua: req.headers.get("user-agent") ?? undefined });
  track("session_start", { userId: user.id, props: { provider: "email" } });

  return setSessionCookie(ok({ user: toPublic(user), created: !existing }) as NextResponse, token, "site", expiresAt);
});
