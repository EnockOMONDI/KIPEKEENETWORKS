import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/request-security";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  await assertSameOrigin();
  const user = await currentUser();
  if (!user?.workspace || !user.company) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { jobId } = await context.params;
  const job = await prisma.hermesJob.findFirst({
    where: {
      id: jobId,
      workspaceId: user.workspaceId,
      companyId: user.companyId
    },
    select: { id: true, status: true }
  });

  if (!job) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  if (job.status === "PENDING") {
    await prisma.hermesJob.update({
      where: { id: job.id },
      data: {
        status: "CANCELLED",
        error: "Cancelled by user before execution.",
        completedAt: new Date()
      }
    });
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  if (job.status === "RUNNING") {
    await prisma.hermesJob.update({
      where: { id: job.id },
      data: {
        status: "CANCEL_REQUESTED",
        error: "Cancellation requested by user."
      }
    });
    return NextResponse.json({ ok: true, status: "CANCEL_REQUESTED" });
  }

  return NextResponse.json({ ok: true, status: job.status });
}
