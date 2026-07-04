import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { databaseEnvPresence, healthEnvPresence } from "@/lib/health-diagnostics";
import { logError } from "@/lib/server-log";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        database: "reachable",
        latencyMs: Date.now() - startedAt,
        env: healthEnvPresence()
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    logError("health.database_unreachable", error, {
      latencyMs: Date.now() - startedAt,
      env: databaseEnvPresence()
    });
    return NextResponse.json(
      {
        ok: false,
        database: "unreachable"
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
