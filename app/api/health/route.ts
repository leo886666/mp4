import { NextResponse } from "next/server";
import { count } from "@/lib/server/db";
import { queueDepth } from "@/lib/server/jobs";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      status: "up",
      time: new Date().toISOString(),
      storage: env.storageDriver,
      gateway: env.gateway,
      counts: {
        users: count("SELECT COUNT(*) FROM users"),
        series: count("SELECT COUNT(*) FROM series"),
        episodes: count("SELECT COUNT(*) FROM episodes"),
        orders: count("SELECT COUNT(*) FROM orders"),
        events: count("SELECT COUNT(*) FROM events"),
        mediaReady: count("SELECT COUNT(*) FROM media_assets WHERE status='ready'"),
        mediaTotal: count("SELECT COUNT(*) FROM media_assets"),
      },
      jobs: queueDepth(),
    },
  });
}
