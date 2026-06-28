"use server";

import { mkdir, writeFile } from "fs/promises";
import { randomBytes, randomUUID } from "crypto";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { login, logout, requireUser } from "./auth";
import { employeeTemplates } from "./seed-data";
import { companyNamespace, hermesHomePath, hermesProfileName } from "./isolation";
import { hashPassword, hashToken } from "./security";
import { canManageBilling, canManageCompany, canManageTeam, isKipekeeAdmin, roles } from "./roles";
import { assertSameOrigin, assertValidEmail } from "./request-security";

const maxUploadBytes = 10 * 1024 * 1024;
const allowedUploadTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/markdown",
  "text/plain"
]);

function id(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

async function availableSlug(baseSlug: string) {
  const fallback = `company-${Date.now()}`;
  const normalized = baseSlug || fallback;
  let slug = normalized;
  let suffix = 2;

  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${normalized}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function inviteToken() {
  return randomBytes(32).toString("hex");
}

function inviteExpiresAt() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
}

function safeInviteRole(role: string, user: { role: string; company: { slug: string } }) {
  const allowedRoles: string[] = [roles.CLIENT_OWNER, roles.CLIENT_ADMIN, roles.CLIENT_MEMBER, roles.ADMIN, roles.MEMBER];
  const safeRole = allowedRoles.includes(role) ? role : roles.CLIENT_MEMBER;
  if (safeRole === roles.CLIENT_OWNER && !isKipekeeAdmin(user) && user.role !== roles.CLIENT_OWNER && user.role !== roles.OWNER) {
    return roles.CLIENT_ADMIN;
  }

  return safeRole;
}

function storageProvider() {
  return process.env.KIPEKEE_STORAGE_PROVIDER || "local";
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
  const user = await requireUser();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  const templateId = String(formData.get("templateId") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const requestedProfile = String(formData.get("hermesProfile") ?? "").trim();
  const namespace = user.company.hermesNamespace ?? companyNamespace(user.company.slug);
  const hermesProfile =
    requestedProfile ||
    (user.company.isolationTier === "PROFILE" ? hermesProfileName(namespace, displayName) : "");

  await prisma.companyEmployee.create({
    data: {
      companyId: user.companyId,
      templateId,
      displayName,
      hermesProfile: hermesProfile || null
    }
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actor: user.email,
      action: "employee.created",
      target: displayName
    }
  });

  revalidatePath("/employees");
}

export async function uploadArtifactAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const file = formData.get("file");
  const addToMemory = formData.get("addToMemory") === "on";
  const employees = formData.getAll("employeeIds").map(String);

  if (!(file instanceof File) || file.size === 0) {
    redirect("/artifacts?error=file");
  }
  if (file.size > maxUploadBytes) {
    redirect("/artifacts?error=file-size");
  }
  if (file.type && !allowedUploadTypes.has(file.type) && !file.name.endsWith(".md")) {
    redirect("/artifacts?error=file-type");
  }
  if (storageProvider() === "local" && process.env.NODE_ENV === "production") {
    redirect("/artifacts?error=storage");
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

  const companyDir = path.join(process.cwd(), "uploads", user.company.slug);
  await mkdir(companyDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storedName = `${Date.now()}-${safeName}`;
  const storagePath = path.join(companyDir, storedName);
  await writeFile(storagePath, bytes);

  const extractedText =
    file.type.startsWith("text/") || safeName.endsWith(".md")
      ? bytes.toString("utf8").slice(0, 25000)
      : null;

  const artifact = await prisma.artifact.create({
    data: {
      companyId: user.companyId,
      uploadedBy: user.email,
      title: file.name,
      kind: file.type || "file",
      storagePath,
      extractedText,
      memoryStatus: addToMemory ? "MEMORY_INDEXED" : "ARTIFACT_ONLY"
    }
  });

  for (const employeeId of allowedEmployeeIds) {
    await prisma.artifactAccess.create({
      data: {
        artifactId: artifact.id,
        employeeId,
        canUseAsMemory: addToMemory
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actor: user.email,
      action: "artifact.uploaded",
      target: file.name,
      metadata: JSON.stringify({ addToMemory, employees: Array.from(allowedEmployeeIds) })
    }
  });

  revalidatePath("/artifacts");
}

export async function chatAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  const employeeId = String(formData.get("employeeId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const existingSessionId = String(formData.get("sessionId") ?? "");

  if (!employeeId || !prompt) {
    redirect("/chat");
  }

  const employee = await prisma.companyEmployee.findFirstOrThrow({
    where: { id: employeeId, companyId: user.companyId }
  });

  const existingSession = existingSessionId
    ? await prisma.session.findFirst({
        where: {
          id: existingSessionId,
          companyId: user.companyId
        }
      })
    : null;
  const session =
    existingSession?.employeeId === employeeId
      ? existingSession
      : await prisma.session.create({
          data: {
            companyId: user.companyId,
            employeeId,
            title: prompt.slice(0, 80)
          }
        });

  await prisma.message.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: prompt
    }
  });
  await prisma.session.update({
    where: { id: session.id },
    data: { updatedAt: new Date() }
  });

  const access = await prisma.artifactAccess.findMany({
    where: { employeeId, canUseAsMemory: true },
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

  const task = {
    companyId: user.companyId,
    companyName: user.company.name,
    isolationTier: user.company.isolationTier,
    hermesNamespace: user.company.hermesNamespace,
    agentId: employee.id,
    sessionId: session.id,
    employeeName: employee.displayName,
    hermesProfile: employee.hermesProfile,
    prompt,
    allowedArtifactIds: access.map((item) => item.artifactId),
    allowedToolsets: ["chat", "documents", "memory", "audit"],
    memoryContext
  };

  const job = await prisma.hermesJob.create({
    data: {
      companyId: task.companyId,
      employeeId: task.agentId,
      sessionId: task.sessionId,
      prompt: task.prompt,
      employeeName: task.employeeName ?? employee.displayName,
      hermesProfile: task.hermesProfile,
      companyName: task.companyName ?? user.company.name,
      isolationTier: task.isolationTier ?? "SHARED",
      hermesNamespace: task.hermesNamespace,
      allowedArtifactIds: JSON.stringify(task.allowedArtifactIds),
      allowedToolsets: JSON.stringify(task.allowedToolsets),
      memoryContext: task.memoryContext,
      status: "PENDING"
    }
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actor: user.email,
      action: "chat.queued",
      target: employee.displayName,
      metadata: JSON.stringify({ jobId: job.id, executionMode: "queue" })
    }
  });

  revalidatePath("/chat");
  redirect(`/chat?session=${session.id}`);
}

export async function runLoopNowAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  const loopId = String(formData.get("loopId"));

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

  revalidatePath("/loops");
  revalidatePath("/approvals");
  redirect(`/chat?session=${session.id}`);
}

export async function createLoopAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  const employeeId = String(formData.get("employeeId"));
  const employee = await prisma.companyEmployee.findFirst({
    where: { id: employeeId, companyId: user.companyId }
  });
  if (!employee) {
    redirect("/loops?error=employee");
  }
  await prisma.businessLoop.create({
    data: {
      companyId: user.companyId,
      employeeId,
      name: String(formData.get("name")),
      schedule: String(formData.get("schedule")),
      status: "DRAFT",
      requiresApproval: formData.get("requiresApproval") === "on",
      outputTarget: String(formData.get("outputTarget") || "Approval inbox")
    }
  });
  revalidatePath("/loops");
}

export async function createApprovalAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  await prisma.approvalRequest.create({
    data: {
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
  const user = await requireUser();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  const approvalId = String(formData.get("approvalId"));
  const status = String(formData.get("status"));
  await prisma.approvalRequest.updateMany({
    where: { id: approvalId, companyId: user.companyId },
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
  const packageId = String(formData.get("packageId"));
  const isolationTier = String(formData.get("isolationTier") || "SHARED");
  const companyName = String(formData.get("companyName")).trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  let createdInviteToken: string | null = null;
  if (!companyName) {
    redirect("/onboarding?error=company-name");
  }

  const baseSlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug = await availableSlug(baseSlug);
  const namespace = companyNamespace(slug);
  const homePath = isolationTier === "CONTAINER" || isolationTier === "DEPLOYMENT" ? hermesHomePath(namespace) : null;
  const pkg = await prisma.onboardingPackage.findUniqueOrThrow({ where: { id: packageId } });
  const includedEmployeeCount = pkg.includedEmployees ?? 0;
  const includedTemplateNames = employeeTemplates.slice(0, includedEmployeeCount);
  const templates = await prisma.employeeTemplate.findMany({
    where: { name: { in: includedTemplateNames } }
  });
  const templatesByName = new Map(templates.map((template) => [template.name, template]));

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        id: id("company"),
        name: companyName,
        slug,
        status: "TRIAL",
        isolationTier,
        hermesNamespace: namespace,
        hermesHomePath: homePath,
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
            actor: user.email,
            action: "company.onboarded",
            target: companyName,
            metadata: JSON.stringify({
              package: pkg.name,
              includedEmployees: includedEmployeeCount,
              isolationTier,
              hermesNamespace: namespace,
              hermesHomePath: homePath
            })
          }
        }
      }
    });

    if (ownerName && ownerEmail) {
      assertValidEmail(ownerEmail);
      const token = inviteToken();
      createdInviteToken = token;
      await tx.teamInvite.create({
        data: {
          companyId: company.id,
          name: ownerName,
          email: ownerEmail,
          role: roles.CLIENT_OWNER,
          tokenHash: hashToken(token),
          invitedBy: user.email,
          expiresAt: inviteExpiresAt()
        }
      });

      await tx.auditLog.create({
        data: {
          companyId: company.id,
          actor: user.email,
          action: "client.owner.invited",
          target: ownerEmail
        }
      });
    }

    for (const templateName of includedTemplateNames) {
      const template = templatesByName.get(templateName);
      if (!template) {
        continue;
      }

      await tx.companyEmployee.create({
        data: {
          companyId: company.id,
          templateId: template.id,
          displayName: templateName,
          hermesProfile: isolationTier === "PROFILE" ? hermesProfileName(namespace, templateName) : null
        }
      });
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

    if (pkg.loopsEnabled && includedTemplateNames.includes("Marketing Manager")) {
      const marketingEmployee = await tx.companyEmployee.findFirst({
        where: { companyId: company.id, displayName: "Marketing Manager" }
      });

      if (marketingEmployee) {
        await tx.businessLoop.create({
          data: {
            companyId: company.id,
            employeeId: marketingEmployee.id,
            name: "Weekly business growth plan",
            schedule: "Every Monday 09:00 Africa/Nairobi",
            status: "DRAFT",
            requiresApproval: true,
            outputTarget: "Approval inbox"
          }
        });
      }
    }
  });

  revalidatePath("/onboarding");
  if (createdInviteToken) {
    redirect(`/onboarding?invite=${createdInviteToken}`);
  }
}

export async function createInvoiceAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }
  const companyId = String(formData.get("companyId") || user.companyId);
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    redirect("/billing?error=company");
  }
  await prisma.invoice.create({
    data: {
      companyId,
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
  const user = await requireUser();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  const provider = String(formData.get("provider"));
  const displayName = String(formData.get("displayName"));
  const scopes = String(formData.get("scopes"));

  await prisma.integrationConnection.upsert({
    where: {
      companyId_provider: {
        companyId: user.companyId,
        provider
      }
    },
    update: {
      displayName,
      scopes,
      status: "PLANNED",
      connectedBy: user.email
    },
    create: {
      companyId: user.companyId,
      provider,
      displayName,
      scopes,
      status: "PLANNED",
      connectedBy: user.email
    }
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actor: user.email,
      action: "integration.planned",
      target: displayName,
      metadata: JSON.stringify({ provider, scopes })
    }
  });

  revalidatePath("/integrations");
}

export async function createTeamInviteAction(formData: FormData) {
  await assertSameOrigin();
  const user = await requireUser();
  if (!canManageTeam(user)) {
    redirect("/dashboard");
  }

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
      companyId: user.companyId,
      name,
      email,
      role,
      tokenHash: hashToken(token),
      invitedBy: user.email,
      expiresAt: inviteExpiresAt()
    }
  });

  await prisma.auditLog.create({
    data: {
      companyId: user.companyId,
      actor: user.email,
      action: "team.user.invited",
      target: email,
      metadata: JSON.stringify({ role })
    }
  });

  revalidatePath("/team");
  redirect(`/team?invite=${token}`);
}

export async function acceptInviteAction(formData: FormData) {
  await assertSameOrigin();
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token || !password || password !== confirmPassword || password.length < 8) {
    redirect(`/invite/${token}?error=password`);
  }

  const invite = await prisma.teamInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { company: true }
  });

  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    redirect(`/invite/${token}?error=invalid`);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      companyId: invite.companyId,
      email: invite.email
    }
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: invite.name,
        passwordHash: hashPassword(password),
        role: invite.role
      }
    });
  } else {
    await prisma.user.create({
      data: {
        companyId: invite.companyId,
        name: invite.name,
        email: invite.email,
        passwordHash: hashPassword(password),
        role: invite.role
      }
    });
  }

  await prisma.$transaction([
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() }
    }),
    prisma.auditLog.create({
      data: {
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
