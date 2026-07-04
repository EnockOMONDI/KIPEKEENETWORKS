import { prisma } from "../lib/db";
import { runHermesTask } from "../lib/hermes";
import { verifyHermesJobSignature } from "../lib/hermes-job-signing";
import { buildMemoryContextFromArtifacts } from "../lib/memory-context";

const workerId = process.env.KIPEKEE_WORKER_ID || `worker-${process.pid}`;
const pollIntervalMs = Number(process.env.KIPEKEE_WORKER_POLL_MS || 3000);
const staleRunningMs = Number(process.env.KIPEKEE_WORKER_STALE_RUNNING_MS || 10 * 60 * 1000);
const maxJobAttempts = Number(process.env.KIPEKEE_WORKER_MAX_ATTEMPTS || 3);
const once = process.argv.includes("--once");

async function writeHeartbeat(currentJobId?: string | null) {
  await prisma.workerHeartbeat.upsert({
    where: { workerId },
    update: {
      runtime: process.env.KIPEKEE_WORKER_RUNTIME || "local",
      status: "ONLINE",
      currentJobId,
      lastSeenAt: new Date(),
      metadata: JSON.stringify({
        pid: process.pid,
        mode: process.env.KIPEKEE_HERMES_MODE || "mock",
        pollIntervalMs
      })
    },
    create: {
      workerId,
      runtime: process.env.KIPEKEE_WORKER_RUNTIME || "local",
      status: "ONLINE",
      currentJobId,
      metadata: JSON.stringify({
        pid: process.pid,
        mode: process.env.KIPEKEE_HERMES_MODE || "mock",
        pollIntervalMs
      })
    }
  });
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function recoverStaleRunningJobs() {
  const staleBefore = new Date(Date.now() - staleRunningMs);
  const retryable = await prisma.hermesJob.updateMany({
    where: {
      status: "RUNNING",
      lockedAt: { lt: staleBefore },
      attempts: { lt: maxJobAttempts }
    },
    data: {
      status: "PENDING",
      lockedAt: null,
      lockedBy: null,
      error: "Recovered stale running job for retry."
    }
  });

  const failed = await prisma.hermesJob.updateMany({
    where: {
      status: "RUNNING",
      lockedAt: { lt: staleBefore },
      attempts: { gte: maxJobAttempts }
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      error: "Hermes job exceeded retry limit after stale worker lock."
    }
  });

  if (retryable.count || failed.count) {
    console.log(`[${workerId}] Recovered ${retryable.count} stale job(s), failed ${failed.count} exhausted job(s).`);
  }
}

async function claimJob() {
  await recoverStaleRunningJobs();
  const job = await prisma.hermesJob.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" }
  });

  if (!job) {
    return null;
  }

  try {
    const claimed = await prisma.hermesJob.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: {
        status: "RUNNING",
        lockedAt: new Date(),
        lockedBy: workerId,
        attempts: { increment: 1 }
      }
    });

    if (claimed.count !== 1) {
      return null;
    }

    return await prisma.hermesJob.findUnique({ where: { id: job.id } });
  } catch {
    return null;
  }
}

async function failJob(jobId: string, workspaceId: string, companyId: string, reason: string) {
  await prisma.$transaction([
    prisma.hermesJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: reason,
        completedAt: new Date()
      }
    }),
    prisma.auditLog.create({
      data: {
        workspaceId,
        companyId,
        actor: workerId,
        action: "hermes.job.rejected",
        target: jobId,
        metadata: JSON.stringify({ reason })
      }
    })
  ]);
}

async function processOne() {
  const job = await claimJob();
  if (!job) {
    return false;
  }

  console.log(`[${workerId}] Running job ${job.id}`);

  try {
    await writeHeartbeat(job.id);
    const signatureOk = verifyHermesJobSignature(
      {
        workspaceId: job.workspaceId,
        companyId: job.companyId,
        companyRuntimeId: job.companyRuntimeId,
        employeeId: job.employeeId,
        sessionId: job.sessionId,
        workflowId: job.workflowId,
        prompt: job.prompt,
        employeeName: job.employeeName,
        companyName: job.companyName,
        runtimeProfile: job.runtimeProfile,
        skillKeys: job.skillKeys,
        allowedArtifactIds: job.allowedArtifactIds,
        allowedToolsets: job.allowedToolsets,
        memoryContext: job.memoryContext
      },
      job.jobSignature
    );

    if (!signatureOk) {
      await failJob(job.id, job.workspaceId, job.companyId, "Invalid Hermes job signature.");
      await writeHeartbeat(null);
      return true;
    }

    const canonical = await prisma.companyEmployee.findFirst({
      where: {
        id: job.employeeId,
        companyId: job.companyId,
        company: {
          workspaceId: job.workspaceId,
          runtime: {
            id: job.companyRuntimeId,
            hermesProfile: job.runtimeProfile
          }
        },
        sessions: {
          some: {
            id: job.sessionId,
            workspaceId: job.workspaceId,
            companyId: job.companyId
          }
        }
      },
      include: {
        company: {
          include: {
            runtime: true,
            brandVoice: true,
            businessRules: {
              where: { active: true }
            }
          }
        },
        skills: {
          where: { enabled: true },
          include: { skill: true }
        },
        workflows: {
          where: { enabled: true },
          include: { workflow: true }
        },
        artifactAccess: {
          where: {
            canUseAsMemory: true,
            artifact: {
              OR: [
                { companyId: job.companyId },
                { workspaceId: job.workspaceId, companyId: null }
              ]
            }
          },
          include: { artifact: true }
        }
      }
    });

    if (!canonical || !canonical.company.runtime) {
      await failJob(job.id, job.workspaceId, job.companyId, "Hermes job failed workspace/company runtime validation.");
      await writeHeartbeat(null);
      return true;
    }

    const requestedSkillKeys = parseJsonArray(job.skillKeys);
    const allowedSkillKeys = new Set(canonical.skills.map((item) => item.skill.key));
    if (requestedSkillKeys.some((key) => !allowedSkillKeys.has(key))) {
      await failJob(job.id, job.workspaceId, job.companyId, "Hermes job requested an unauthorized skill.");
      await writeHeartbeat(null);
      return true;
    }

    const workflow = job.workflowId
      ? canonical.workflows.find((item) => item.workflowId === job.workflowId)?.workflow ?? null
      : null;
    if (job.workflowId && !workflow) {
      await failJob(job.id, job.workspaceId, job.companyId, "Hermes job requested an unauthorized workflow.");
      await writeHeartbeat(null);
      return true;
    }

    const businessRules = canonical.company.businessRules
      .filter((rule) => !rule.workflowId || rule.workflowId === job.workflowId)
      .map((rule) => `- ${rule.name}: ${rule.ruleText}`)
      .join("\n");
    const brandVoice = canonical.company.brandVoice
      ? [
          `Tone: ${canonical.company.brandVoice.tone}`,
          canonical.company.brandVoice.styleRules,
          canonical.company.brandVoice.formattingPreferences,
          canonical.company.brandVoice.forbiddenWords ? `Forbidden wording: ${canonical.company.brandVoice.forbiddenWords}` : ""
        ].filter(Boolean).join("\n")
      : null;

    const result = await runHermesTask({
      workspaceId: job.workspaceId,
      companyId: canonical.companyId,
      companyRuntimeId: canonical.company.runtime.id,
      companyName: canonical.company.name,
      companyType: canonical.company.type,
      runtimeProfile: canonical.company.runtime.hermesProfile,
      agentId: canonical.id,
      sessionId: job.sessionId,
      workflowName: workflow?.name,
      workflowDescription: workflow?.description,
      employeeName: canonical.displayName,
      roleInstructions: canonical.roleInstructions,
      skillSummaries: canonical.skills.map((item) => `${item.skill.name}: ${item.skill.description}`),
      prompt: job.prompt,
      allowedArtifactIds: canonical.artifactAccess.map((item) => item.artifactId),
      allowedToolsets: parseJsonArray(job.allowedToolsets),
      memoryContext: buildMemoryContextFromArtifacts(canonical.artifactAccess.map((item) => item.artifact)),
      brandVoice,
      businessRules
    });

    await prisma.$transaction([
      prisma.message.create({
        data: {
          sessionId: job.sessionId,
          role: "assistant",
          content: result.output
        }
      }),
      prisma.hermesJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          result: result.output,
          error: null,
          completedAt: new Date()
        }
      }),
      prisma.auditLog.create({
        data: {
          workspaceId: job.workspaceId,
          companyId: job.companyId,
          actor: workerId,
          action: "hermes.job.completed",
          target: canonical.displayName,
          metadata: JSON.stringify({ jobId: job.id, metadata: result.metadata })
        }
      })
    ]);

    await writeHeartbeat(null);
    console.log(`[${workerId}] Completed job ${job.id}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.hermesJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        error: message,
        completedAt: new Date()
      }
    });
    await writeHeartbeat(null);
    console.error(`[${workerId}] Failed job ${job.id}: ${message}`);
    return true;
  }
}

async function main() {
  console.log(`[${workerId}] Hermes worker started. Poll interval: ${pollIntervalMs}ms`);
  await writeHeartbeat(null);

  do {
    const didWork = await processOne();
    if (once) {
      break;
    }
    if (!didWork) {
      await writeHeartbeat(null);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  } while (true);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
