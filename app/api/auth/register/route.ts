import { NextResponse } from "next/server";
import { body, clientIp, conflict, email as emailOf, forbidden, ok, route, str } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/crypto";
import { createUser, findByEmail, toPublic } from "@/lib/server/repo/users";
import { createSession, setSessionCookie } from "@/lib/server/session";
import { getSetting } from "@/lib/server/repo/ops";
import { track } from "@/lib/server/repo/stats";
import { notify } from "@/lib/server/notify";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  if (!getSetting<boolean>("site.registrationOpen")) throw forbidden("Registration is temporarily closed");

  const data = await body(req);
  const email = emailOf(data.email);
  const name = str(data.name, "name", { min: 2, max: 40 });
  const password = str(data.password, "password", { min: 8, max: 100, trim: false });

  if (findByEmail(email)) throw conflict("That email already has an account");

  const user = createUser({
    email,
    name,
    passwordHash: hashPassword(password),
    country: str(data.country, "country", { optional: true }) || "US",
    channel: str(data.channel, "channel", { optional: true }) || "organic",
  });

  const { token, expiresAt } = createSession(user.id, "site", { ip: clientIp(req), ua: req.headers.get("user-agent") ?? undefined });
  track("sign_up", { userId: user.id, props: { provider: "email" } });
  notify({ userId: user.id, kind: "welcome", title: "Welcome to VESPER", body: "Your first three episodes of every series are on us.", link: "/discover" });
  audit({ actorId: user.id, actorName: user.name, action: "user.register", targetType: "user", targetId: user.id, ip: clientIp(req) });

  const res = ok({ user: toPublic(user) }) as NextResponse;
  return setSessionCookie(res, token, "site", expiresAt);
});
