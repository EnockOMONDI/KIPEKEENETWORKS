import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user?.workspace || !user.company) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("session") ?? "";
  if (!sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const session = await prisma.session.findFirst({
    where: {
      id: sessionId,
      workspaceId: user.workspaceId,
      companyId: user.companyId
    },
    select: { id: true }
  });

  if (!session) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const [latestJob, latestAssistantMessage] = await Promise.all([
    prisma.hermesJob.findFirst({
      where: {
        sessionId,
        workspaceId: user.workspaceId,
        companyId: user.companyId
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        employeeName: true,
        createdAt: true,
        completedAt: true
      }
    }),
    prisma.message.findFirst({
      where: {
        sessionId,
        role: "assistant"
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true
      }
    })
  ]);

  const active = latestJob ? ["PENDING", "RUNNING", "CANCEL_REQUESTED"].includes(latestJob.status) : false;

  return NextResponse.json(
    {
      ok: true,
      active,
      latestJob,
      latestAssistantMessage
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
