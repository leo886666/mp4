import { NextResponse } from "next/server";
import { body, clientIp, email as emailOf, forbidden, ok, route, str, unauthorized } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/crypto";
import { findByEmail, toPublic } from "@/lib/server/repo/users";
import { createSession, setSessionCookie } from "@/lib/server/session";
import { track } from "@/lib/server/repo/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const data = await body(req);
  const email = emailOf(data.email);
  const password = str(data.password, "password", { min: 1, trim: false });

  const user = findByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) throw unauthorized("Email or password is incorrect");
  if (user.status !== "active") throw forbidden("This account is suspended");

  const { token, expiresAt } = createSession(user.id, "site", { ip: clientIp(req), ua: req.headers.get("user-agent") ?? undefined });
  track("session_start", { userId: user.id });

  const res = ok({ user: toPublic(user) }) as NextResponse;
  return setSessionCookie(res, token, "site", expiresAt);
});
