import { prisma } from "../lib/db";
import { runHermesTask } from "../lib/hermes";

const workerId = process.env.KIPEKEE_WORKER_ID || `worker-${process.pid}`;
const pollIntervalMs = Number(process.env.KIPEKEE_WORKER_POLL_MS || 3000);
const once = process.argv.includes("--once");

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
    return await prisma.hermesJob.update({
      where: { id: job.id },
      data: {
        status: "RUNNING",
        lockedAt: new Date(),
        lockedBy: workerId,
        attempts: { increment: 1 }
      }
    });
  } catch {
    return null;
  }
}

async function processOne() {
  const job = await claimJob();
  if (!job) {
    return false;
  }

  console.log(`[${workerId}] Running job ${job.id} for ${job.companyName} / ${job.employeeName}`);

  try {
    const result = await runHermesTask({
      companyId: job.companyId,
      companyName: job.companyName,
      isolationTier: job.isolationTier,
      hermesNamespace: job.hermesNamespace,
      agentId: job.employeeId,
      sessionId: job.sessionId,
      employeeName: job.employeeName,
      hermesProfile: job.hermesProfile,
      prompt: job.prompt,
      allowedArtifactIds: parseJsonArray(job.allowedArtifactIds),
      allowedToolsets: parseJsonArray(job.allowedToolsets),
      memoryContext: job.memoryContext ?? undefined
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
          target: job.employeeName,
          metadata: JSON.stringify({ jobId: job.id, metadata: result.metadata })
        }
      })
    ]);

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
    console.error(`[${workerId}] Failed job ${job.id}: ${message}`);
    return true;
  }
}

async function main() {
  console.log(`[${workerId}] Hermes worker started. Poll interval: ${pollIntervalMs}ms`);

  do {
    const didWork = await processOne();
    if (once) {
      break;
    }
    if (!didWork) {
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
