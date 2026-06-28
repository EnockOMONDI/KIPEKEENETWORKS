import { prisma } from "../lib/db";

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
        companyId: loop.companyId,
        employeeId: loop.employeeId,
        title: `Loop: ${loop.name}`
      }
    });
    await prisma.hermesJob.create({
      data: {
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
        memoryContext,
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
