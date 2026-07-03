import { prisma } from "../lib/db";
import { runHermesTask } from "../lib/hermes";
import { verifyHermesJobSignature } from "../lib/hermes-job-signing";
import { buildMemoryContextFromArtifacts } from "../lib/memory-context";

const workerId = process.env.KIPEKEE_WORKER_ID || `worker-${process.pid}`;
const pollIntervalMs = Number(process.env.KIPEKEE_WORKER_POLL_MS || 3000);
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

async function claimJob() {
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

async function failJob(jobId: string, companyId: string, reason: string) {
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
        companyId: job.companyId,
        employeeId: job.employeeId,
        sessionId: job.sessionId,
        prompt: job.prompt,
        employeeName: job.employeeName,
        hermesProfile: job.hermesProfile,
        companyName: job.companyName,
        isolationTier: job.isolationTier,
        hermesNamespace: job.hermesNamespace,
        allowedArtifactIds: job.allowedArtifactIds,
        allowedToolsets: job.allowedToolsets,
        memoryContext: job.memoryContext
      },
      job.jobSignature
    );

    if (!signatureOk) {
      await failJob(job.id, job.companyId, "Invalid Hermes job signature.");
      await writeHeartbeat(null);
      return true;
    }

    const canonical = await prisma.companyEmployee.findFirst({
      where: {
        id: job.employeeId,
        companyId: job.companyId,
        sessions: {
          some: {
            id: job.sessionId,
            companyId: job.companyId
          }
        }
      },
      include: {
        company: true,
        artifactAccess: {
          where: { canUseAsMemory: true },
          include: { artifact: true }
        }
      }
    });

    if (!canonical) {
      await failJob(job.id, job.companyId, "Hermes job failed tenant ownership validation.");
      await writeHeartbeat(null);
      return true;
    }

    if ((job.hermesProfile ?? null) !== (canonical.hermesProfile ?? null)) {
      await failJob(job.id, job.companyId, "Hermes job profile does not match employee profile.");
      await writeHeartbeat(null);
      return true;
    }

    const profileSetup = await prisma.employeeProfileSetup.findFirst({
      where: {
        companyId: job.companyId,
        employeeId: job.employeeId,
        status: "APPROVED"
      }
    });

    const result = await runHermesTask({
      companyId: canonical.companyId,
      companyName: canonical.company.name,
      isolationTier: canonical.company.isolationTier,
      hermesNamespace: canonical.company.hermesNamespace,
      agentId: canonical.id,
      sessionId: job.sessionId,
      employeeName: canonical.displayName,
      hermesProfile: canonical.hermesProfile,
      prompt: job.prompt,
      allowedArtifactIds: canonical.artifactAccess.map((item) => item.artifactId),
      allowedToolsets: parseJsonArray(job.allowedToolsets),
      memoryContext: buildMemoryContextFromArtifacts(canonical.artifactAccess.map((item) => item.artifact)),
      profileSetupSoul: profileSetup?.approvedSoul ?? profileSetup?.draftSoul
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
