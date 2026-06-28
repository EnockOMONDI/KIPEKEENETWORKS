import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCompany } from "@/lib/roles";

export async function POST(request: NextRequest) {
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

  const memoryContext = access
    .map((item) => {
      const text = item.artifact.extractedText?.trim();
      if (!text) {
        return null;
      }
      return `Artifact: ${item.artifact.title}\n${text.slice(0, 6000)}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  const session = await prisma.session.create({
    data: {
      companyId: user.companyId,
      employeeId: loop.employeeId,
      title: `Loop: ${loop.name}`
    }
  });
  await prisma.hermesJob.create({
    data: {
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
      memoryContext,
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
