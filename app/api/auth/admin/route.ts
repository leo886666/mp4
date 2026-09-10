import { NextResponse } from "next/server";
import { body, clientIp, email as emailOf, forbidden, ok, route, str, unauthorized } from "@/lib/server/http";
import { verifyPassword } from "@/lib/server/crypto";
import { findByEmail, toPublic } from "@/lib/server/repo/users";
import { COOKIE, clearSessionCookie, createSession, currentUser, revokeSession, setSessionCookie } from "@/lib/server/session";
import { isStaff, PERMISSIONS, ROLE_LABEL, type Role } from "@/lib/server/rbac";
import { audit } from "@/lib/server/audit";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Console session. Separate cookie + separate scope from the viewer session. */
export const POST = route(async (req: Request) => {
  const data = await body(req);
  const email = emailOf(data.email);
  const password = str(data.password, "password", { min: 1, trim: false });

  const user = findByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) throw unauthorized("Email or password is incorrect");
  if (!isStaff(user.role)) throw forbidden("This account has no console access");
  if (user.status !== "active") throw forbidden("This account is suspended");

  const { token, expiresAt } = createSession(user.id, "admin", { ip: clientIp(req), ua: req.headers.get("user-agent") ?? undefined });
  audit({ actorId: user.id, actorName: user.name, action: "console.login", ip: clientIp(req) });

  const res = ok({
    user: toPublic(user),
    role: user.role,
    roleLabel: ROLE_LABEL[user.role as Role],
    permissions: PERMISSIONS[user.role as Role] ?? [],
  }) as NextResponse;
  return setSessionCookie(res, token, "admin", expiresAt);
});

export const GET = route(async () => {
  const user = currentUser("admin");
  if (!user) return ok({ user: null, permissions: [] });
  return ok({
    user,
    role: user.role,
    roleLabel: ROLE_LABEL[user.role as Role],
    permissions: PERMISSIONS[user.role as Role] ?? [],
  });
});

export const DELETE = route(async () => {
  const token = cookies().get(COOKIE.admin)?.value;
  if (token) revokeSession(token);
  const res = ok({ signedOut: true }) as NextResponse;
  return clearSessionCookie(res, "admin");
});
