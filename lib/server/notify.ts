import { all, count, insert, now, run } from "./db";
import { newId } from "./ids";

export function notify(input: { userId: string; kind: string; title: string; body?: string; link?: string }) {
  insert("notifications", {
    id: newId("ntf"),
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    read_at: null,
    created_at: now(),
  });
}

export const listNotifications = (userId: string, limit = 30) =>
  all(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, userId, limit);

export const unreadCount = (userId: string) =>
  count("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read_at IS NULL", userId);

export const markAllRead = (userId: string) =>
  run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", now(), userId);
