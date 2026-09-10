import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ok, route } from "@/lib/server/http";
import { COOKIE, clearSessionCookie, revokeSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async () => {
  const token = (await cookies()).get(COOKIE.site)?.value;
  if (token) revokeSession(token);
  const res = ok({ signedOut: true }) as NextResponse;
  clearSessionCookie(res, "site");
  return clearSessionCookie(res, "admin");
});
