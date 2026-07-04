import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assertHermesJobSigningConfigured, signHermesJob } from "@/lib/hermes-job-signing";
import { buildMemoryContextFromArtifacts } from "@/lib/memory-context";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { canManageCompany } from "@/lib/roles";

function parseJsonArray(value?: string | null) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  await assertSameOrigin();
  const user = await currentUser();
  if (!user) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/login" }
    });
  }
  if (!user.workspace || !user.company || !canManageCompany(user)) {
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
        headers: { Location: "/workflows?error=rate-limit" }
      });
    }
    throw error;
  }

  const formData = await request.formData();
  const workflowId = String(formData.get("workflowId") ?? formData.get("loopId") ?? "");

  const employeeWorkflow = await prisma.employeeWorkflow.findFirstOrThrow({
    where: {
      workflowId,
      workflow: { companyId: user.companyId },
      enabled: true
    },
    include: {
      workflow: { include: { company: { include: { runtime: true } } } },
      employee: {
        include: {
          skills: { where: { enabled: true }, include: { skill: true } }
        }
      }
    }
  });

  const runtime = employeeWorkflow.workflow.company.runtime;
  if (!runtime) {
    return new NextResponse(null, {
      status: 303,
      headers: { Location: "/workflows?error=runtime" }
    });
  }
  assertHermesJobSigningConfigured();

  const access = await prisma.artifactAccess.findMany({
    where: {
      employeeId: employeeWorkflow.employeeId,
      canUseAsMemory: true,
      artifact: {
        OR: [
          { companyId: user.companyId },
          { workspaceId: user.workspaceId, companyId: null }
        ]
      }
    },
    include: { artifact: true }
  });

  const memoryContext = buildMemoryContextFromArtifacts(access.map((item) => item.artifact));
  const skillKeys = employeeWorkflow.employee.skills.map((item) => item.skill.key);
  const allowedToolsets = Array.from(new Set(employeeWorkflow.employee.skills.flatMap((item) => parseJsonArray(item.skill.defaultToolsets))));
  const session = await prisma.session.create({
    data: {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      employeeId: employeeWorkflow.employeeId,
      workflowId: employeeWorkflow.workflowId,
      title: `Work instruction: ${employeeWorkflow.workflow.name}`
    }
  });
  const jobData = {
    workspaceId: user.workspaceId,
    companyId: user.companyId,
    companyRuntimeId: runtime.id,
    employeeId: employeeWorkflow.employeeId,
    sessionId: session.id,
    workflowId: employeeWorkflow.workflowId,
    prompt: `Follow this company work instruction: ${employeeWorkflow.workflow.name}. Prepare the result for human approval.`,
    employeeName: employeeWorkflow.employee.displayName,
    companyName: user.company.name,
    runtimeProfile: runtime.hermesProfile,
    skillKeys: JSON.stringify(skillKeys),
    allowedArtifactIds: JSON.stringify(access.map((item) => item.artifactId)),
    allowedToolsets: JSON.stringify(allowedToolsets.length ? allowedToolsets : ["chat", "documents", "memory", "audit"]),
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
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      actor: user.email,
      action: "workflow.queued",
      target: employeeWorkflow.workflow.name,
      metadata: JSON.stringify({ sessionId: session.id })
    }
  });

  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/chat?session=${session.id}` }
  });
}
