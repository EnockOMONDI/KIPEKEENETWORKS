import { prisma } from "../lib/db";
import { signHermesJob } from "../lib/hermes-job-signing";
import { buildMemoryContextFromArtifacts } from "../lib/memory-context";

async function main() {
  const loops = await prisma.businessLoop.findMany({
    where: { status: "ACTIVE" },
    include: {
      company: true,
      employee: true
    }
  });

  for (const loop of loops) {
    const access = await prisma.artifactAccess.findMany({
      where: { employeeId: loop.employeeId, canUseAsMemory: true },
      include: { artifact: true }
    });

    const memoryContext = buildMemoryContextFromArtifacts(access.map((item) => item.artifact));

    const session = await prisma.session.create({
      data: {
        companyId: loop.companyId,
        employeeId: loop.employeeId,
        title: `Loop: ${loop.name}`
      }
    });
    const jobData = {
        companyId: loop.companyId,
        employeeId: loop.employeeId,
        sessionId: session.id,
        prompt: `Run the scheduled business loop: ${loop.name}. Prepare the result for human approval.`,
        employeeName: loop.employee.displayName,
        hermesProfile: loop.employee.hermesProfile,
        companyName: loop.company.name,
        isolationTier: loop.company.isolationTier,
        hermesNamespace: loop.company.hermesNamespace,
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
        companyId: loop.companyId,
        actor: "loop-runner",
        action: "loop.queued",
        target: loop.name,
        metadata: JSON.stringify({ sessionId: session.id })
      }
    });
  }

  console.log(`Queued ${loops.length} active loop(s).`);
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
