import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signHermesJob } from "@/lib/hermes-job-signing";
import { buildMemoryContextFromArtifacts } from "@/lib/memory-context";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { canManageCompany } from "@/lib/roles";

export async function POST(request: NextRequest) {
  await assertSameOrigin();
  const user = await currentUser();
  if (!user) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/login" }
    });
  }
  if (!canManageCompany(user)) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/dashboard" }
    });
  }
  try {
    await enforceRateLimit("loop_run", [`company:${user.companyId}`, `user:${user.id}`]);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return new NextResponse(null, {
        status: 303,
        headers: { Location: "/loops?error=rate-limit" }
      });
    }
    throw error;
  }

  const formData = await request.formData();
  const loopId = String(formData.get("loopId") ?? "");

  const loop = await prisma.businessLoop.findFirstOrThrow({
    where: { id: loopId, companyId: user.companyId },
    include: { employee: true }
  });

  const access = await prisma.artifactAccess.findMany({
    where: { employeeId: loop.employeeId, canUseAsMemory: true },
    include: { artifact: true }
  });

  const memoryContext = buildMemoryContextFromArtifacts(access.map((item) => item.artifact));

  const session = await prisma.session.create({
    data: {
      companyId: user.companyId,
      employeeId: loop.employeeId,
      title: `Loop: ${loop.name}`
    }
  });
  const jobData = {
      companyId: user.companyId,
      employeeId: loop.employeeId,
      sessionId: session.id,
      prompt: `Run the scheduled business loop: ${loop.name}. Prepare the result for human approval.`,
      employeeName: loop.employee.displayName,
      hermesProfile: loop.employee.hermesProfile,
      companyName: user.company.name,
      isolationTier: user.company.isolationTier,
      hermesNamespace: user.company.hermesNamespace,
      allowedArtifactIds: JSON.stringify(access.map((item) => item.artifactId)),
      allowedToolsets: JSON.stringify(["chat", "documents", "memory", "audit"]),
      memoryContext
  };

  await prisma.hermesJob.create({
    data: {
      ...jobData,
      jobSignature: signHermesJob(jobData),
      status: "PENDING"
    }
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actor: user.email,
      action: "loop.queued",
      target: loop.name,
      metadata: JSON.stringify({ sessionId: session.id })
    }
  });

  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/chat?session=${session.id}` }
  });
}
