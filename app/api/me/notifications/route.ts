import { ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { listNotifications, markAllRead, unreadCount } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = requireUser("site");
  return ok({ items: listNotifications(user.id), unread: unreadCount(user.id) });
});

export const POST = route(async () => {
  const user = requireUser("site");
  markAllRead(user.id);
  return ok({ unread: 0 });
});
