import { all, count, insert, now } from "./db";
import { newId } from "./ids";

export function audit(input: {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: unknown;
  ip?: string | null;
}) {
  insert("audit_logs", {
    id: newId("aud"),
    ts: now(),
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    detail: input.detail === undefined ? null : typeof input.detail === "string" ? input.detail : JSON.stringify(input.detail),
    ip: input.ip ?? null,
  });
}

export function listAudit(opts: { q?: string; action?: string; limit: number; offset: number }) {
  const where: string[] = ["1=1"];
  const params: any[] = [];
  if (opts.q) {
    where.push("(actor_name LIKE ? OR action LIKE ? OR target_id LIKE ? OR detail LIKE ?)");
    const like = `%${opts.q}%`;
    params.push(like, like, like, like);
  }
  if (opts.action) {
    where.push("action = ?");
    params.push(opts.action);
  }
  const w = where.join(" AND ");
  return {
    rows: all(`SELECT * FROM audit_logs WHERE ${w} ORDER BY ts DESC LIMIT ? OFFSET ?`, ...params, opts.limit, opts.offset),
    total: count(`SELECT COUNT(*) FROM audit_logs WHERE ${w}`, ...params),
  };
}
