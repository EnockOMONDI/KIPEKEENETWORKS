"use server";

import { randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { login, logout, requireCompanyContext, requireUser } from "./auth";
import { provisionCompanyRuntimeProfile } from "./company-runtime-provisioning";
import { prisma } from "./db";
import { assertHermesJobSigningConfigured, signHermesJob } from "./hermes-job-signing";
import { setInviteFlash } from "./invite-flash";
import { companyNamespace, companyRuntimeProfileName, hermesHomePath, safeIsolationTier } from "./isolation";
import { buildMemoryContextFromArtifacts } from "./memory-context";
import { enforceRateLimit, RateLimitAction, RateLimitError } from "./rate-limit";
import { assertSameOrigin, assertValidEmail } from "./request-security";
import { canManageBilling, canManageCompany, canManageTeam, isKipekeeAdmin, roles } from "./roles";
import { employeeTemplates, safeOrganisationType, starterWorkflowTemplates } from "./seed-data";
import { hashPassword, hashToken } from "./security";
import { logError, logInfo } from "./server-log";
import { storeArtifactObject } from "./storage";
import { validateArtifactUpload } from "./upload-policy";
const allowedIntegrationProviders = new Set([
  "whatsapp",
  "gmail",
  "outlook",
  "google-drive",
  "google-calendar",
  "crm"
]);

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`;
}

async function availableSlug(model: "workspace" | "company", baseSlug: string) {
  let slug = baseSlug || `${model}-${Date.now()}`;
  let suffix = 2;

  while (
    model === "workspace"
      ? await prisma.workspace.findUnique({ where: { slug } })
      : await prisma.company.findUnique({ where: { slug } })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function inviteToken() {
  return randomBytes(32).toString("hex");
}

function inviteExpiresAt() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 5);
}

function inviteMaxOpenCount() {
  return Number(process.env.KIPEKEE_INVITE_MAX_OPENS || 5);
}

function uploadReturnTo(formData: FormData) {
  const value = String(formData.get("returnTo") ?? "/artifacts");
  return value === "/documents" ? "/documents" : "/artifacts";
}

function uploadRedirect(returnTo: string, code: string): never {
  redirect(`${returnTo}?error=${encodeURIComponent(code)}`);
}

async function enforceRateLimitOrRedirect(action: RateLimitAction, subjects: string[], redirectTo: string) {
  try {
    await enforceRateLimit(action, subjects);
  } catch (error) {
    if (error instanceof RateLimitError) {
      redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}error=rate-limit`);
    }
    throw error;
  }
}

function safeInviteRole(role: string, user: { role: string; memberRole?: string }) {
  const allowedRoles: string[] = [roles.CLIENT_OWNER, roles.CLIENT_ADMIN, roles.CLIENT_MEMBER, roles.ADMIN, roles.MEMBER, roles.OWNER];
  const safeRole = allowedRoles.includes(role) ? role : roles.CLIENT_MEMBER;
  if (safeRole === roles.CLIENT_OWNER && !isKipekeeAdmin(user) && user.memberRole !== roles.OWNER && user.role !== roles.OWNER) {
    return roles.CLIENT_ADMIN;
  }

  return safeRole;
}

function defaultRoleInstructions(employeeName: string, companyName: string) {
  return [
    `${employeeName} works for ${companyName}.`,
    "Use only approved company/workspace knowledge and assigned company work instructions.",
    "Draft sensitive external actions for human approval."
  ].join("\n");
}

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

async function assignDefaultSkills(employeeId: string, skillKeys: string[]) {
  const skills = await prisma.skill.findMany({ where: { key: { in: skillKeys }, enabled: true } });
  for (const skill of skills) {
    await prisma.employeeSkill.upsert({
      where: {
        employeeId_skillId: {
          employeeId,
          skillId: skill.id
        }
      },
      update: { enabled: true },
      create: {
        employeeId,
        skillId: skill.id,
        enabled: true
      }
    });
  }
}

async function installWorkflowTemplate(companyId: string, workflowTemplateKey: string) {
  const template = await prisma.workflowTemplate.findUnique({
    where: { key: workflowTemplateKey },
    include: {
      steps: {
        orderBy: { stepOrder: "asc" }
      }
    }
  });
  if (!template) {
    return;
  }

  const employee = await prisma.companyEmployee.findFirst({
    where: { companyId, displayName: template.defaultEmployeeName }
  });
  if (!employee) {
    return;
  }

  const workflow = await prisma.workflow.create({
    data: {
      companyId,
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      schedule: template.schedule,
      approvalPolicy: template.approvalPolicy,
      status: "ACTIVE"
    }
  });

  await prisma.employeeWorkflow.create({
    data: {
      employeeId: employee.id,
      workflowId: workflow.id,
      enabled: true
    }
  });

  for (const step of template.steps) {
    await prisma.workflowStep.create({
      data: {
        workflowId: workflow.id,
        skillId: step.skillId,
        stepOrder: step.stepOrder,
        stepType: step.stepType,
        instruction: step.instruction,
        inputMapping: step.inputMapping,
        outputMapping: step.outputMapping,
        requiresApproval: step.requiresApproval
      }
    });
  }
}

export async function loginAction(formData: FormData) {
  await assertSameOrigin();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await login(email, password);
  if (!result.ok) {
    redirect("/login?error=1");
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await assertSameOrigin();
  await logout();
  redirect("/login");
}

export async function createEmployeeAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("employee_create", [`company:${user.companyId}`, `user:${user.id}`], "/employees");
  const templateId = String(formData.get("templateId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const template = await prisma.employeeTemplate.findFirstOrThrow({ where: { id: templateId } });
  const employee = await prisma.companyEmployee.create({
    data: {
      companyId: user.companyId,
      templateId,
      displayName: displayName || template.name,
      roleInstructions: defaultRoleInstructions(displayName || template.name, user.company.name)
    }
  });
  await assignDefaultSkills(employee.id, parseJsonArray(template.defaultSkills));
  await prisma.auditLog.create({
    data: {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      actor: user.email,
      action: "employee.created",
      target: employee.displayName
    }
  });

  revalidatePath("/employees");
}

export async function saveEmployeeRoleAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("employee_profile_save", [`company:${user.companyId}`, `user:${user.id}`], "/employees");
  const employeeId = String(formData.get("employeeId") ?? "");
  const roleInstructions = String(formData.get("roleInstructions") ?? "").trim();
  await prisma.companyEmployee.updateMany({
    where: { id: employeeId, companyId: user.companyId },
    data: { roleInstructions }
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      actor: user.email,
      action: "employee.role.updated",
      target: employeeId
    }
  });
  revalidatePath("/employees");
}

export async function uploadArtifactAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  const returnTo = uploadReturnTo(formData);
  await enforceRateLimitOrRedirect("artifact_upload", [`company:${user.companyId}`, `user:${user.id}`], returnTo);
  const file = formData.get("file");
  const addToMemory = formData.get("addToMemory") === "on";
  const ownerType = String(formData.get("ownerType") ?? "COMPANY") === "WORKSPACE" ? "WORKSPACE" : "COMPANY";
  const employees = formData.getAll("employeeIds").map(String);

  if (!(file instanceof File) || file.size === 0) {
    uploadRedirect(returnTo, "file");
  }
  const uploadPolicy = validateArtifactUpload({
    fileName: file.name,
    size: file.size,
    type: file.type
  });
  if (uploadPolicy !== "ok") {
    uploadRedirect(returnTo, uploadPolicy === "storage-upgrade" ? "storage-upgrade" : uploadPolicy);
  }

  const allowedEmployees = employees.length
    ? await prisma.companyEmployee.findMany({
        where: {
          companyId: user.companyId,
          id: { in: employees }
        },
        select: { id: true }
      })
    : [];
  const allowedEmployeeIds = new Set(allowedEmployees.map((employee) => employee.id));
  const artifactId = id("artifact");
  const bytes = Buffer.from(await file.arrayBuffer());
  logInfo("artifact.upload.requested", {
    workspaceId: user.workspaceId,
    companyId: user.companyId,
    userId: user.id,
    fileName: file.name,
    fileSize: file.size,
    ownerType,
    employeeCount: employees.length
  });

  const stored = await storeArtifactObject({
    artifactId,
    bytes,
    companyId: user.companyId,
    companySlug: user.company.slug,
    contentType: file.type || "application/octet-stream",
    fileName: file.name
  }).catch((error) => {
    logError("artifact.upload.storage_failed", error, {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      fileName: file.name
    });
    return null;
  });

  if (!stored) {
    uploadRedirect(returnTo, "storage");
  }

  const extractedText =
    file.type.startsWith("text/") || file.name.endsWith(".md")
      ? bytes.toString("utf8").slice(0, 25000)
      : null;

  await prisma.$transaction(async (tx) => {
    const collection = await tx.knowledgeCollection.create({
      data: {
        workspaceId: user.workspaceId,
        companyId: ownerType === "COMPANY" ? user.companyId : null,
        ownerType,
        ownerId: ownerType === "COMPANY" ? user.companyId : user.workspaceId,
        name: file.name,
        category: "uploaded",
        sensitivity: "NORMAL"
      }
    });

    const artifact = await tx.artifact.create({
      data: {
        id: artifactId,
        workspaceId: user.workspaceId,
        companyId: ownerType === "COMPANY" ? user.companyId : null,
        collectionId: collection.id,
        uploadedByUserId: user.id,
        title: file.name,
        kind: file.type || "file",
        storagePath: stored.storagePath,
        storageProvider: stored.storageProvider,
        fileSizeBytes: file.size,
        extractedText,
        memoryStatus: addToMemory ? "MEMORY_INDEXED" : "ARTIFACT_ONLY"
      }
    });

    if (extractedText) {
      await tx.knowledgeChunk.create({
        data: {
          artifactId: artifact.id,
          collectionId: collection.id,
          chunkIndex: 0,
          text: extractedText.slice(0, 6000),
          metadata: JSON.stringify({ source: "upload" })
        }
      });
    }

    if (allowedEmployeeIds.size) {
      await tx.artifactAccess.createMany({
        data: Array.from(allowedEmployeeIds).map((employeeId) => ({
          artifactId: artifact.id,
          employeeId,
          canUseAsMemory: addToMemory
        })),
        skipDuplicates: true
      });
    }

    await tx.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        companyId: user.companyId,
        actor: user.email,
        action: "artifact.uploaded",
        target: file.name,
        metadata: JSON.stringify({ ownerType, addToMemory, employees: Array.from(allowedEmployeeIds) })
      }
    });
  });

  revalidatePath("/artifacts");
  revalidatePath("/documents");
  redirect(`${returnTo}?uploaded=1`);
}

async function buildJobInput(user: any, employeeId: string, prompt: string, sessionId?: string, workflowId?: string) {
  const employee = await prisma.companyEmployee.findFirstOrThrow({
    where: { id: employeeId, companyId: user.companyId },
    include: {
      skills: {
        where: { enabled: true },
        include: { skill: true }
      },
      workflows: {
        where: { enabled: true },
        include: { workflow: true }
      }
    }
  });

  const workflow = workflowId
    ? employee.workflows.find((item) => item.workflowId === workflowId)?.workflow ?? null
    : null;

  if (workflowId && !workflow) {
    redirect("/chat?error=workflow");
  }

  const runtime = await prisma.companyRuntime.findUniqueOrThrow({
    where: { companyId: user.companyId }
  });

  const session = sessionId
    ? await prisma.session.findFirst({
        where: {
          id: sessionId,
          workspaceId: user.workspaceId,
          companyId: user.companyId,
          employeeId
        }
      })
    : null;

  const activeSession =
    session ??
    await prisma.session.create({
      data: {
        workspaceId: user.workspaceId,
        companyId: user.companyId,
        employeeId,
        workflowId: workflow?.id,
        title: prompt.slice(0, 80)
      }
    });

  const access = await prisma.artifactAccess.findMany({
    where: {
      employeeId,
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
  const skillKeys = employee.skills.map((item) => item.skill.key);
  const allowedToolsets = Array.from(new Set(employee.skills.flatMap((item) => parseJsonArray(item.skill.defaultToolsets))));
  const brandVoice = await prisma.brandVoice.findUnique({ where: { companyId: user.companyId } });
  const businessRules = await prisma.businessRule.findMany({
    where: {
      companyId: user.companyId,
      active: true,
      OR: [{ workflowId: null }, { workflowId: workflow?.id }]
    },
    orderBy: { severity: "desc" }
  });

  const jobData = {
    workspaceId: user.workspaceId,
    companyId: user.companyId,
    companyRuntimeId: runtime.id,
    employeeId: employee.id,
    sessionId: activeSession.id,
    workflowId: workflow?.id ?? null,
    prompt,
    employeeName: employee.displayName,
    companyName: user.company.name,
    runtimeProfile: runtime.hermesProfile,
    skillKeys: JSON.stringify(skillKeys),
    allowedArtifactIds: JSON.stringify(access.map((item) => item.artifactId)),
    allowedToolsets: JSON.stringify(allowedToolsets.length ? allowedToolsets : ["chat", "documents", "memory", "audit"]),
    memoryContext
  };

  return {
    employee,
    workflow,
    runtime,
    session: activeSession,
    brandVoice,
    businessRules,
    access,
    jobData: {
      ...jobData,
      jobSignature: signHermesJob(jobData)
    }
  };
}

export async function chatAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  const employeeId = String(formData.get("employeeId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const existingSessionId = String(formData.get("sessionId") ?? "");
  const workflowId = String(formData.get("workflowId") ?? "") || undefined;

  if (!employeeId || !prompt) {
    redirect("/chat");
  }
  logInfo("chat.submit.received", {
    workspaceId: user.workspaceId,
    companyId: user.companyId,
    userId: user.id,
    employeeId,
    existingSessionId: existingSessionId || null,
    workflowId: workflowId || null,
    promptLength: prompt.length
  });
  await enforceRateLimitOrRedirect("chat_create", [`company:${user.companyId}`, `user:${user.id}`, `employee:${employeeId}`], "/chat");
  assertHermesJobSigningConfigured();

  let input: Awaited<ReturnType<typeof buildJobInput>>;
  try {
    input = await buildJobInput(user, employeeId, prompt, existingSessionId, workflowId);
  } catch (error) {
    logError("chat.submit.build_job_input_failed", error, {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      employeeId,
      existingSessionId: existingSessionId || null,
      workflowId: workflowId || null
    });
    throw error;
  }

  const { employee, session, jobData } = input;

  try {
    await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        sessionId: session.id,
        role: "user",
        content: prompt
      }
    });
    await tx.session.update({
      where: { id: session.id },
      data: { updatedAt: new Date() }
    });

    const job = await tx.hermesJob.create({
      data: {
        ...jobData,
        status: "PENDING"
      }
    });

    await tx.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        companyId: user.companyId,
        actor: user.email,
        action: "chat.queued",
        target: employee.displayName,
        metadata: JSON.stringify({ jobId: job.id, executionMode: "queue", runtimeProfile: job.runtimeProfile })
      }
    });
    });
  } catch (error) {
    logError("chat.submit.transaction_failed", error, {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      employeeId,
      sessionId: session.id
    });
    throw error;
  }

  logInfo("chat.submit.queued", {
    workspaceId: user.workspaceId,
    companyId: user.companyId,
    employeeId,
    sessionId: session.id,
    runtimeProfile: jobData.runtimeProfile
  });

  revalidatePath("/chat");
  redirect(`/chat?session=${session.id}`);
}

export async function runWorkflowNowAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("loop_run", [`company:${user.companyId}`, `user:${user.id}`], "/workflows");
  const workflowId = String(formData.get("workflowId"));

  const employeeWorkflow = await prisma.employeeWorkflow.findFirstOrThrow({
    where: {
      workflowId,
      workflow: { companyId: user.companyId },
      enabled: true
    },
    include: { employee: true, workflow: true }
  });

  assertHermesJobSigningConfigured();

  const prompt = `Follow this company work instruction: ${employeeWorkflow.workflow.name}. Prepare the result for human approval.`;
  const { session, jobData } = await buildJobInput(user, employeeWorkflow.employeeId, prompt, undefined, workflowId);
  await prisma.hermesJob.create({
    data: {
      ...jobData,
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

  revalidatePath("/workflows");
  revalidatePath("/approvals");
  redirect(`/chat?session=${session.id}`);
}

export async function createWorkflowAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("loop_run", [`company:${user.companyId}`, `user:${user.id}`, "create"], "/workflows");
  const employeeId = String(formData.get("employeeId"));
  const employee = await prisma.companyEmployee.findFirst({
    where: { id: employeeId, companyId: user.companyId }
  });
  if (!employee) {
    redirect("/workflows?error=employee");
  }
  const workflow = await prisma.workflow.create({
    data: {
      companyId: user.companyId,
      name: String(formData.get("name")),
      description: String(formData.get("description") || "Manual work instruction"),
      triggerType: String(formData.get("triggerType") || "MANUAL"),
      schedule: String(formData.get("schedule") || ""),
      approvalPolicy: formData.get("requiresApproval") === "on" ? "APPROVAL_REQUIRED" : "NO_APPROVAL",
      status: "DRAFT"
    }
  });
  await prisma.employeeWorkflow.create({
    data: {
      employeeId,
      workflowId: workflow.id
    }
  });
  await prisma.workflowStep.create({
    data: {
      workflowId: workflow.id,
      stepOrder: 1,
      instruction: String(formData.get("description") || "Complete the work instruction using approved company context."),
      requiresApproval: formData.get("requiresApproval") === "on"
    }
  });
  revalidatePath("/workflows");
}

export async function createApprovalAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  await enforceRateLimitOrRedirect("approval_create", [`company:${user.companyId}`, `user:${user.id}`], "/approvals");
  await prisma.approvalRequest.create({
    data: {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      title: String(formData.get("title")),
      details: String(formData.get("details")),
      requestedBy: user.email
    }
  });
  revalidatePath("/approvals");
}

export async function decideApprovalAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("approval_decide", [`company:${user.companyId}`, `user:${user.id}`], "/approvals");
  const approvalId = String(formData.get("approvalId"));
  const status = String(formData.get("status"));
  await prisma.approvalRequest.updateMany({
    where: { id: approvalId, workspaceId: user.workspaceId, companyId: user.companyId },
    data: { status: ["APPROVED", "REJECTED"].includes(status) ? status : "PENDING", decidedAt: new Date() }
  });
  revalidatePath("/approvals");
}

export async function createCompanyAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("company_onboarding", [`user:${user.id}`], "/onboarding");
  const packageId = String(formData.get("packageId"));
  const isolationTier = safeIsolationTier(String(formData.get("isolationTier") || "PROFILE"));
  const workspaceName = String(formData.get("workspaceName") || formData.get("companyName") || "").trim();
  const companyName = String(formData.get("companyName")).trim();
  const companyType = safeOrganisationType(String(formData.get("companyType") || "COMPANY"));
  const industryKey = String(formData.get("industryKey") || "general-business");
  const countryCode = String(formData.get("countryCode") || "KE").trim().toUpperCase().slice(0, 2) || "KE";
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  let createdInviteToken: string | null = null;
  if (!companyName || !workspaceName) {
    redirect("/onboarding?error=company-name");
  }

  const workspaceSlug = await availableSlug("workspace", slugify(workspaceName));
  const companySlug = await availableSlug("company", slugify(companyName));
  const runtimeNamespace = companyNamespace(companySlug);
  const runtimeProfile = companyRuntimeProfileName(runtimeNamespace);
  const homePath = isolationTier === "CONTAINER" || isolationTier === "DEPLOYMENT" ? hermesHomePath(runtimeNamespace) : null;
  const pkg = await prisma.onboardingPackage.findUniqueOrThrow({ where: { id: packageId } });
  const industryTemplate = await prisma.industryTemplate.findFirst({
    where: { key: industryKey, active: true },
    include: { workflows: { include: { workflowTemplate: true } } }
  });
  const includedEmployeeCount = pkg.includedEmployees ?? 0;
  const industryEmployeeNames = parseJsonArray(industryTemplate?.recommendedEmployees);
  const baseEmployeeNames = industryEmployeeNames.length
    ? industryEmployeeNames
    : employeeTemplates.map((template) => template.name);
  const includedTemplateNames = (includedEmployeeCount ? baseEmployeeNames.slice(0, includedEmployeeCount) : baseEmployeeNames).filter(
    (name, index, values) => values.indexOf(name) === index
  );
  const collectionNames = (parseJsonArray(industryTemplate?.knowledgeCollections).length
    ? parseJsonArray(industryTemplate?.knowledgeCollections)
    : ["Organization profile", "Company knowledge"]).filter((name, index, values) => values.indexOf(name) === index);
  const businessRuleTexts = (parseJsonArray(industryTemplate?.businessRules).length
    ? parseJsonArray(industryTemplate?.businessRules)
    : ["AI employees can draft external messages and actions, but humans must approve before sending."]).filter(
    (rule, index, values) => values.indexOf(rule) === index
  );
  const workflowTemplateKeys = industryTemplate?.workflows.length
    ? industryTemplate.workflows.map((workflow) => workflow.workflowTemplate.key)
    : starterWorkflowTemplates.map((workflow) => workflow.key);
  const templates = await prisma.employeeTemplate.findMany({
    where: { name: { in: includedTemplateNames } }
  });
  const templatesByName = new Map(templates.map((template) => [template.name, template]));
  let createdCompanyId: string | null = null;
  let createdWorkspaceId: string | null = null;

  await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        id: id("workspace"),
        name: workspaceName,
        slug: workspaceSlug,
        type: "BUSINESS_GROUP",
        status: "ACTIVE"
      }
    });

    const company = await tx.company.create({
      data: {
        id: id("company"),
        workspaceId: workspace.id,
        name: companyName,
        slug: companySlug,
        type: companyType,
        industryKey: industryTemplate?.key ?? industryKey,
        countryCode,
        status: "ACTIVE",
        isolationTier,
        hermesNamespace: runtimeNamespace,
        runtime: {
          create: {
            workspaceId: workspace.id,
            runtimeType: isolationTier,
            hermesProfile: runtimeProfile,
            hermesHomePath: homePath,
            status: "PENDING"
          }
        },
        brandVoice: {
          create: {
            tone: industryTemplate?.brandVoiceTone ?? "Clear, warm, professional",
            styleRules: industryTemplate?.brandVoiceRules ?? "Use simple business language and ask for missing context.",
            forbiddenWords: "Do not reveal platform infrastructure or private deployment details.",
            formattingPreferences: "Use short answers first, then details when useful."
          }
        },
        businessRules: {
          create: businessRuleTexts.map((ruleText, index) => ({
            name: index === 0 ? "Approval-first external actions" : `Industry rule ${index + 1}`,
            category: "security",
            ruleText,
            severity: index === 0 ? "HIGH" : "NORMAL"
          }))
        },
        subscription: {
          create: {
            onboardingPackageId: packageId,
            setupFeeKes: pkg.priceKes ?? 0,
            monthlyUserPriceKes: 4500,
            paidUsers: 1
          }
        },
        audits: {
          create: {
            workspaceId: workspace.id,
            actor: user.email,
            action: "company.onboarded",
            target: companyName,
            metadata: JSON.stringify({
              workspace: workspaceName,
              organisationType: companyType,
              industry: industryTemplate?.key ?? industryKey,
              countryCode,
              package: pkg.name,
              includedEmployees: includedEmployeeCount,
              isolationTier,
              runtimeProfile
            })
          }
        }
      }
    });
    createdCompanyId = company.id;
    createdWorkspaceId = workspace.id;

    await tx.knowledgeCollection.createMany({
      data: collectionNames.map((name) => ({
        workspaceId: workspace.id,
        companyId: name === "Organization profile" ? null : company.id,
        ownerType: name === "Organization profile" ? "WORKSPACE" : "COMPANY",
        ownerId: name === "Organization profile" ? workspace.id : company.id,
        name,
        category: slugify(name),
        sensitivity: "NORMAL"
      }))
    });

    if (ownerName && ownerEmail) {
      assertValidEmail(ownerEmail);
      const token = inviteToken();
      createdInviteToken = token;
      await tx.teamInvite.create({
        data: {
          workspaceId: workspace.id,
          companyId: company.id,
          name: ownerName,
          email: ownerEmail,
          role: roles.CLIENT_OWNER,
          tokenHash: hashToken(token),
          invitedBy: user.email,
          expiresAt: inviteExpiresAt(),
          maxOpenCount: inviteMaxOpenCount()
        }
      });
    }

    for (const templateName of includedTemplateNames) {
      const template = templatesByName.get(templateName);
      const templateConfig = employeeTemplates.find((item) => item.name === templateName);
      if (!template) {
        continue;
      }
      const employee = await tx.companyEmployee.create({
        data: {
          companyId: company.id,
          templateId: template.id,
          displayName: templateName,
          roleInstructions: defaultRoleInstructions(templateName, company.name)
        }
      });
      const skills = await tx.skill.findMany({ where: { key: { in: templateConfig?.skills ?? [] } } });
      for (const skill of skills) {
        await tx.employeeSkill.create({
          data: {
            employeeId: employee.id,
            skillId: skill.id
          }
        });
      }
    }

    if (pkg.priceKes) {
      await tx.invoice.create({
        data: {
          companyId: company.id,
          invoiceNo: `KN-${Date.now().toString().slice(-8)}`,
          description: `${pkg.name} setup/onboarding fee`,
          amountKes: pkg.priceKes,
          status: "DRAFT"
        }
      });
    }
  });

  if (createdCompanyId && pkg.loopsEnabled) {
    for (const workflowTemplateKey of workflowTemplateKeys) {
      await installWorkflowTemplate(createdCompanyId, workflowTemplateKey);
    }
  }

  if (createdCompanyId) {
    const provisionResult = await provisionCompanyRuntimeProfile(createdCompanyId);
    if (!provisionResult.ok) {
      logError("company.onboarding.runtime_provision_deferred", new Error(provisionResult.reason), {
        companyId: createdCompanyId,
        runtimeProfile
      });
    }
    await prisma.auditLog.create({
      data: {
        workspaceId: createdWorkspaceId,
        companyId: createdCompanyId,
        actor: user.email,
        action: provisionResult.ok ? "runtime.provisioned" : "runtime.provision.deferred",
        target: runtimeProfile,
        metadata: JSON.stringify(provisionResult)
      }
    });
  }

  revalidatePath("/onboarding");
  if (createdInviteToken) {
    await setInviteFlash("onboarding", createdInviteToken);
    redirect("/onboarding?inviteCreated=1");
  }
}

export async function createInvoiceAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageBilling(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("invoice_create", [`user:${user.id}`], "/billing");
  const requestedCompanyId = String(formData.get("companyId") ?? "");
  const invoiceCompanyId = isKipekeeAdmin(user) && requestedCompanyId ? requestedCompanyId : user.companyId;
  const invoiceCompany = await prisma.company.findFirst({
    where: isKipekeeAdmin(user)
      ? { id: invoiceCompanyId }
      : { id: user.companyId, workspaceId: user.workspaceId },
    select: { id: true }
  });
  if (!invoiceCompany) {
    redirect("/billing?error=company");
  }
  await prisma.invoice.create({
    data: {
      companyId: invoiceCompany.id,
      invoiceNo: String(formData.get("invoiceNo")),
      description: String(formData.get("description")),
      amountKes: Number(formData.get("amountKes")),
      status: "DRAFT"
    }
  });
  revalidatePath("/billing");
}

export async function planIntegrationAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("integration_request", [`company:${user.companyId}`, `user:${user.id}`], "/integrations");
  const provider = String(formData.get("provider"));
  const displayName = String(formData.get("displayName"));
  const scopes = String(formData.get("scopes"));
  const accountEmail = String(formData.get("accountEmail") || "");
  if (!allowedIntegrationProviders.has(provider)) {
    redirect("/integrations?error=provider");
  }

  await prisma.integrationConnection.create({
    data: {
      ownerType: "COMPANY",
      ownerId: user.companyId,
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      provider,
      displayName,
      accountEmail,
      scopes,
      status: "PLANNED",
      connectedBy: user.email
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      actor: user.email,
      action: "integration.planned",
      target: displayName,
      metadata: JSON.stringify({ provider, scopes, accountEmail })
    }
  });

  revalidatePath("/integrations");
}

export async function createMailboxAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageCompany(user)) {
    redirect("/integrations");
  }
  const connectionId = String(formData.get("connectionId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const emailAddress = String(formData.get("emailAddress") ?? "").trim().toLowerCase();
  const connection = await prisma.integrationConnection.findFirstOrThrow({
    where: { id: connectionId, companyId: user.companyId, workspaceId: user.workspaceId }
  });
  const employee = await prisma.companyEmployee.findFirstOrThrow({
    where: { id: employeeId, companyId: user.companyId }
  });
  const mailbox = await prisma.mailbox.create({
    data: {
      companyId: user.companyId,
      integrationConnectionId: connection.id,
      emailAddress,
      displayName: String(formData.get("displayName") || emailAddress),
      provider: connection.provider,
      status: "PLANNED"
    }
  });
  await prisma.mailboxAccess.create({
    data: {
      mailboxId: mailbox.id,
      employeeId: employee.id,
      canRead: true,
      canDraft: true,
      canRequestSend: true,
      canSendWithoutApproval: false
    }
  });
  revalidatePath("/integrations");
}

export async function createTeamInviteAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageTeam(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("team_invite_create", [`workspace:${user.workspaceId}`, `user:${user.id}`], "/team");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requestedRole = String(formData.get("role") ?? roles.CLIENT_MEMBER);
  const role = safeInviteRole(requestedRole, user);

  if (!name || !email) {
    redirect("/team?error=missing");
  }
  assertValidEmail(email);

  const token = inviteToken();

  await prisma.teamInvite.create({
    data: {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      name,
      email,
      role,
      tokenHash: hashToken(token),
      invitedBy: user.email,
      expiresAt: inviteExpiresAt(),
      maxOpenCount: inviteMaxOpenCount()
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      actor: user.email,
      action: "team.user.invited",
      target: email,
      metadata: JSON.stringify({ role })
    }
  });

  revalidatePath("/team");
  await setInviteFlash("team", token);
  redirect("/team?inviteCreated=1");
}

export async function revokeTeamInviteAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireCompanyContext();
  if (!canManageTeam(user)) {
    redirect("/dashboard");
  }
  await enforceRateLimitOrRedirect("team_invite_revoke", [`workspace:${user.workspaceId}`, `user:${user.id}`], "/team");

  const inviteId = String(formData.get("inviteId") ?? "");
  await prisma.teamInvite.updateMany({
    where: {
      id: inviteId,
      workspaceId: user.workspaceId,
      acceptedAt: null,
      revokedAt: null
    },
    data: {
      revokedAt: new Date(),
      revokedBy: user.email
    }
  });
  await prisma.auditLog.create({
    data: {
      workspaceId: user.workspaceId,
      companyId: user.companyId,
      actor: user.email,
      action: "team.invite.revoked",
      target: inviteId
    }
  });
  revalidatePath("/team");
}

export async function acceptInviteAction(formData: FormData) {
  await assertSameOrigin();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const tokenHash = hashToken(token);
  await enforceRateLimitOrRedirect("invite_accept", [`invite:${tokenHash}`], `/invite/${token}`);

  if (!token || !password || password !== confirmPassword || password.length < 8) {
    redirect(`/invite/${token}?error=password`);
  }

  const invite = await prisma.teamInvite.findUnique({
    where: { tokenHash },
    include: { workspace: true, company: true }
  });

  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date() || invite.openCount >= invite.maxOpenCount) {
    redirect(`/invite/${token}?error=invalid`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: invite.name,
          passwordHash: hashPassword(password)
        }
      })
    : await prisma.user.create({
        data: {
          name: invite.name,
          email: invite.email,
          passwordHash: hashPassword(password),
          role: invite.role
        }
      });

  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: user.id
        }
      },
      update: {
        role: invite.role,
        active: true
      },
      create: {
        workspaceId: invite.workspaceId,
        userId: user.id,
        role: invite.role,
        active: true
      }
    }),
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() }
    }),
    prisma.auditLog.create({
      data: {
        workspaceId: invite.workspaceId,
        companyId: invite.companyId,
        actor: invite.email,
        action: "team.invite.accepted",
        target: invite.email,
        metadata: JSON.stringify({ role: invite.role })
      }
    })
  ]);

  redirect("/login?invite=accepted");
}
