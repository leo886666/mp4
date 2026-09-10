import { forbidden } from "../http";
import { createCreator, creatorForUser, type CreatorRow } from "../repo/ops";
import { requireUser } from "../session";
import { atLeast } from "../rbac";
import type { UserRow } from "../repo/users";

/**
 * Creator context.
 *
 * Any signed-in account can open Creator Studio; the first time it writes,
 * a creators row is provisioned for it. Staff keep their own creator identity
 * so their test uploads never land in someone else's payout.
 */
export async function creatorContext(create = true): Promise<{ user: UserRow; creator: CreatorRow | null }> {
  const user = await requireUser("site");
  let creator = creatorForUser(user.id);
  if (!creator && create) {
    creator = createCreator({ name: user.name, userId: user.id, role: "Creator" });
  }
  return { user, creator };
}

export async function requireCreator(): Promise<{ user: UserRow; creator: CreatorRow }> {
  const { user, creator } = await creatorContext(true);
  if (!creator) throw forbidden("No creator profile");
  return { user, creator };
}

export function assertOwnsSeries(creatorId: string, seriesCreatorId: string | null, role: string) {
  if (seriesCreatorId !== creatorId && !atLeast(role, "admin")) throw forbidden("This series belongs to another creator");
}
