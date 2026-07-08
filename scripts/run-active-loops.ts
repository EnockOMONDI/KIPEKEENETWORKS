import { prisma } from "../lib/db";
import { assertHermesJobSigningConfigured, signHermesJob } from "../lib/hermes-job-signing";
import { buildMemoryContextFromArtifacts } from "../lib/memory-context";

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

async function main() {
  assertHermesJobSigningConfigured();

  const workflows = await prisma.workflow.findMany({
    where: { status: "ACTIVE", triggerType: "SCHEDULED" },
    include: {
      company: { include: { runtime: true } },
      employees: {
        where: { enabled: true },
        include: {
          employee: {
            include: {
              skills: { where: { enabled: true }, include: { skill: true } }
            }
          }
        },
        take: 1
      }
    }
  });

  let queued = 0;
  for (const workflow of workflows) {
    const employee = workflow.employees[0]?.employee;
    const runtime = workflow.company.runtime;
    if (!employee || !runtime) {
      continue;
    }

    const access = await prisma.artifactAccess.findMany({
      where: {
        employeeId: employee.id,
        canUseAsMemory: true,
        artifact: {
          OR: [
            { companyId: workflow.companyId },
            { workspaceId: workflow.company.workspaceId, companyId: null }
          ]
        }
      },
      include: { artifact: true }
    });

    const memoryContext = buildMemoryContextFromArtifacts(access.map((item) => item.artifact));
    const skillKeys = employee.skills.map((item) => item.skill.key);
    const allowedToolsets = Array.from(new Set(employee.skills.flatMap((item) => parseJsonArray(item.skill.defaultToolsets))));

    const session = await prisma.session.create({
      data: {
        workspaceId: workflow.company.workspaceId,
        companyId: workflow.companyId,
        employeeId: employee.id,
        workflowId: workflow.id,
        title: `Workflow: ${workflow.name}`
      }
    });
    const jobData = {
      workspaceId: workflow.company.workspaceId,
      companyId: workflow.companyId,
      companyRuntimeId: runtime.id,
      employeeId: employee.id,
      sessionId: session.id,
      workflowId: workflow.id,
      prompt: `Run the scheduled workflow: ${workflow.name}. Prepare the result for human approval.`,
      employeeName: employee.displayName,
      companyName: workflow.company.name,
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
        workspaceId: workflow.company.workspaceId,
        companyId: workflow.companyId,
        actor: "workflow-runner",
        action: "workflow.queued",
        target: workflow.name,
        metadata: JSON.stringify({ sessionId: session.id })
      }
    });
    queued += 1;
  }

  console.log(`Queued ${queued} active scheduled workflow(s).`);
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
