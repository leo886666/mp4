import { ok, route } from "@/lib/server/http";
import { homeView } from "@/lib/server/services/views";
import { optionalUser } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One request paints the whole home screen: hero, continue watching, rails. */
export const GET = route(async () => ok(homeView(optionalUser("site"))));
