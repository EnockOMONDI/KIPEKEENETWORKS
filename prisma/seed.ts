import { PrismaClient } from "@prisma/client";
import {
  employeeTemplates,
  industryTemplates,
  kipekeeStudioEmployees,
  onboardingPackages,
  skillCatalog,
  starterWorkflowTemplates,
  workflowTemplateCatalog
} from "../lib/seed-data";
import { hashPassword } from "../lib/security";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function namespace(value: string) {
  return slugify(value).replace(/-/g, "").slice(0, 40) || "company";
}

async function seedCatalog() {
  for (const pkg of onboardingPackages) {
    await prisma.onboardingPackage.upsert({
      where: { name: pkg.name },
      update: {
        priceKes: pkg.priceKes,
        description: pkg.description,
        includedEmployees: pkg.includedEmployees,
        loopsEnabled: pkg.loops,
        documentMemory: pkg.documentMemory
      },
      create: {
        name: pkg.name,
        priceKes: pkg.priceKes,
        description: pkg.description,
        includedEmployees: pkg.includedEmployees,
        loopsEnabled: pkg.loops,
        documentMemory: pkg.documentMemory
      }
    });
  }

  for (const skill of skillCatalog) {
    await prisma.skill.upsert({
      where: { key: skill.key },
      update: {
        name: skill.name,
        category: skill.category,
        description: skill.description,
        defaultToolsets: JSON.stringify(skill.defaultToolsets),
        enabled: true
      },
      create: {
        key: skill.key,
        name: skill.name,
        category: skill.category,
        description: skill.description,
        defaultToolsets: JSON.stringify(skill.defaultToolsets),
        enabled: true
      }
    });
  }

  for (const template of employeeTemplates) {
    await prisma.employeeTemplate.upsert({
      where: { name: template.name },
      update: {
        defaultSkills: JSON.stringify(template.skills),
        description: `${template.name} trained on company work instructions, approved knowledge, and assigned reusable skills.`
      },
      create: {
        name: template.name,
        description: `${template.name} trained on company work instructions, approved knowledge, and assigned reusable skills.`,
        defaultTools: "chat,documents,memory,audit",
        defaultSkills: JSON.stringify(template.skills)
      }
    });
  }

  for (const workflowTemplate of workflowTemplateCatalog) {
    const savedTemplate = await prisma.workflowTemplate.upsert({
      where: { key: workflowTemplate.key },
      update: {
        name: workflowTemplate.name,
        description: workflowTemplate.description,
        category: workflowTemplate.category,
        defaultEmployeeName: workflowTemplate.defaultEmployeeName,
        triggerType: workflowTemplate.triggerType,
        schedule: workflowTemplate.schedule,
        approvalPolicy: workflowTemplate.approvalPolicy,
        active: true
      },
      create: {
        key: workflowTemplate.key,
        name: workflowTemplate.name,
        description: workflowTemplate.description,
        category: workflowTemplate.category,
        defaultEmployeeName: workflowTemplate.defaultEmployeeName,
        triggerType: workflowTemplate.triggerType,
        schedule: workflowTemplate.schedule,
        approvalPolicy: workflowTemplate.approvalPolicy,
        active: true
      }
    });

    let stepOrder = 1;
    for (const step of workflowTemplate.steps) {
      const skill = await prisma.skill.findUnique({ where: { key: step.skillKey } });
      await prisma.workflowTemplateStep.upsert({
        where: {
          workflowTemplateId_stepOrder: {
            workflowTemplateId: savedTemplate.id,
            stepOrder
          }
        },
        update: {
          skillId: skill?.id,
          instruction: step.instruction,
          requiresApproval: step.requiresApproval
        },
        create: {
          workflowTemplateId: savedTemplate.id,
          skillId: skill?.id,
          stepOrder,
          stepType: "SKILL",
          instruction: step.instruction,
          requiresApproval: step.requiresApproval
        }
      });
      stepOrder += 1;
    }
  }

  for (const industryTemplate of industryTemplates) {
    const savedIndustry = await prisma.industryTemplate.upsert({
      where: { key: industryTemplate.key },
      update: {
        name: industryTemplate.name,
        description: industryTemplate.description,
        organisationTypes: JSON.stringify(industryTemplate.organisationTypes),
        countryCode: industryTemplate.countryCode,
        brandVoiceTone: industryTemplate.brandVoiceTone,
        brandVoiceRules: industryTemplate.brandVoiceRules,
        businessRules: JSON.stringify(industryTemplate.businessRules),
        knowledgeCollections: JSON.stringify(industryTemplate.knowledgeCollections),
        recommendedEmployees: JSON.stringify(industryTemplate.recommendedEmployees),
        active: true
      },
      create: {
        key: industryTemplate.key,
        name: industryTemplate.name,
        description: industryTemplate.description,
        organisationTypes: JSON.stringify(industryTemplate.organisationTypes),
        countryCode: industryTemplate.countryCode,
        brandVoiceTone: industryTemplate.brandVoiceTone,
        brandVoiceRules: industryTemplate.brandVoiceRules,
        businessRules: JSON.stringify(industryTemplate.businessRules),
        knowledgeCollections: JSON.stringify(industryTemplate.knowledgeCollections),
        recommendedEmployees: JSON.stringify(industryTemplate.recommendedEmployees),
        active: true
      }
    });

    for (const skillKey of industryTemplate.skillKeys) {
      const skill = await prisma.skill.findUnique({ where: { key: skillKey } });
      if (!skill) continue;
      await prisma.industryTemplateSkill.upsert({
        where: {
          industryTemplateId_skillId: {
            industryTemplateId: savedIndustry.id,
            skillId: skill.id
          }
        },
        update: { recommended: true },
        create: {
          industryTemplateId: savedIndustry.id,
          skillId: skill.id,
          recommended: true
        }
      });
    }

    for (const workflowKey of industryTemplate.workflowTemplateKeys) {
      const workflowTemplate = await prisma.workflowTemplate.findUnique({ where: { key: workflowKey } });
      if (!workflowTemplate) continue;
      await prisma.industryTemplateWorkflow.upsert({
        where: {
          industryTemplateId_workflowTemplateId: {
            industryTemplateId: savedIndustry.id,
            workflowTemplateId: workflowTemplate.id
          }
        },
        update: { recommended: true },
        create: {
          industryTemplateId: savedIndustry.id,
          workflowTemplateId: workflowTemplate.id,
          recommended: true
        }
      });
    }
  }
}

async function assignTemplateSkills(employeeId: string, skillKeys: string[]) {
  const skills = await prisma.skill.findMany({
    where: { key: { in: skillKeys } }
  });

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

async function createStarterWorkflow(companyId: string, workflowTemplate: (typeof starterWorkflowTemplates)[number]) {
  const employee = await prisma.companyEmployee.findFirst({
    where: { companyId, displayName: workflowTemplate.defaultEmployeeName }
  });
  if (!employee) {
    return null;
  }

  const workflow = await prisma.workflow.upsert({
    where: { id: `${companyId}-${workflowTemplate.key}` },
    update: {
      name: workflowTemplate.name,
      description: workflowTemplate.description,
      triggerType: workflowTemplate.triggerType,
      schedule: workflowTemplate.schedule,
      approvalPolicy: workflowTemplate.approvalPolicy,
      status: "ACTIVE"
    },
    create: {
      id: `${companyId}-${workflowTemplate.key}`,
      companyId,
      name: workflowTemplate.name,
      description: workflowTemplate.description,
      triggerType: workflowTemplate.triggerType,
      schedule: workflowTemplate.schedule,
      approvalPolicy: workflowTemplate.approvalPolicy,
      status: "ACTIVE"
    }
  });

  await prisma.employeeWorkflow.upsert({
    where: {
      employeeId_workflowId: {
        employeeId: employee.id,
        workflowId: workflow.id
      }
    },
    update: { enabled: true },
    create: {
      employeeId: employee.id,
      workflowId: workflow.id,
      enabled: true
    }
  });

  let order = 1;
  for (const step of workflowTemplate.steps) {
    const skill = await prisma.skill.findUnique({ where: { key: step.skillKey } });
    await prisma.workflowStep.upsert({
      where: {
        workflowId_stepOrder: {
          workflowId: workflow.id,
          stepOrder: order
        }
      },
      update: {
        skillId: skill?.id,
        instruction: step.instruction,
        requiresApproval: step.requiresApproval
      },
      create: {
        workflowId: workflow.id,
        skillId: skill?.id,
        stepOrder: order,
        stepType: "SKILL",
        instruction: step.instruction,
        requiresApproval: step.requiresApproval
      }
    });
    order += 1;
  }

  return workflow;
}

async function installWorkflowTemplate(companyId: string, workflowTemplateKey: string) {
  const template = await prisma.workflowTemplate.findUnique({
    where: { key: workflowTemplateKey },
    include: {
      steps: {
        include: { skill: true },
        orderBy: { stepOrder: "asc" }
      }
    }
  });
  if (!template) {
    return null;
  }

  const employee = await prisma.companyEmployee.findFirst({
    where: { companyId, displayName: template.defaultEmployeeName }
  });
  if (!employee) {
    return null;
  }

  const workflow = await prisma.workflow.upsert({
    where: { id: `${companyId}-${template.key}` },
    update: {
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      schedule: template.schedule,
      approvalPolicy: template.approvalPolicy,
      status: "ACTIVE"
    },
    create: {
      id: `${companyId}-${template.key}`,
      companyId,
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      schedule: template.schedule,
      approvalPolicy: template.approvalPolicy,
      status: "ACTIVE"
    }
  });

  await prisma.employeeWorkflow.upsert({
    where: {
      employeeId_workflowId: {
        employeeId: employee.id,
        workflowId: workflow.id
      }
    },
    update: { enabled: true },
    create: {
      employeeId: employee.id,
      workflowId: workflow.id,
      enabled: true
    }
  });

  for (const step of template.steps) {
    await prisma.workflowStep.upsert({
      where: {
        workflowId_stepOrder: {
          workflowId: workflow.id,
          stepOrder: step.stepOrder
        }
      },
      update: {
        skillId: step.skillId,
        stepType: step.stepType,
        instruction: step.instruction,
        inputMapping: step.inputMapping,
        outputMapping: step.outputMapping,
        requiresApproval: step.requiresApproval
      },
      create: {
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

  return workflow;
}

async function main() {
  const adminEmail = process.env.KIPEKEE_ADMIN_EMAIL || "founder@kipekee.studio";
  const adminPassword = process.env.KIPEKEE_ADMIN_PASSWORD;

  if (!adminPassword || (process.env.NODE_ENV === "production" && adminPassword === "change-this-before-production")) {
    throw new Error("Set KIPEKEE_ADMIN_PASSWORD before seeding.");
  }

  await seedCatalog();

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Dj Sean",
      passwordHash: hashPassword(adminPassword),
      role: "KIPEKEE_ADMIN"
    },
    create: {
      name: "Dj Sean",
      email: adminEmail,
      passwordHash: hashPassword(adminPassword),
      role: "KIPEKEE_ADMIN"
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "kipekee-studio" },
    update: {
      ownerUserId: admin.id,
      status: "ACTIVE"
    },
    create: {
      name: "Kipekee Studio",
      slug: "kipekee-studio",
      type: "BUSINESS_GROUP",
      status: "ACTIVE",
      ownerUserId: admin.id
    }
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: admin.id
      }
    },
    update: {
      role: "OWNER",
      active: true
    },
    create: {
      workspaceId: workspace.id,
      userId: admin.id,
      role: "OWNER",
      active: true
    }
  });

  const businessStarter = await prisma.onboardingPackage.findUniqueOrThrow({
    where: { name: "Business Starter" }
  });

  const company = await prisma.company.upsert({
    where: { slug: "kipekee-studio" },
    update: {
      workspaceId: workspace.id,
      type: "COMPANY",
      industryKey: "general-business",
      countryCode: "KE",
      status: "ACTIVE",
      isolationTier: "PROFILE",
      hermesNamespace: "kipekeestudio"
    },
    create: {
      workspaceId: workspace.id,
      name: "Kipekee Studio",
      slug: "kipekee-studio",
      type: "COMPANY",
      industryKey: "general-business",
      countryCode: "KE",
      status: "ACTIVE",
      isolationTier: "PROFILE",
      hermesNamespace: "kipekeestudio",
      subscription: {
        create: {
          onboardingPackageId: businessStarter.id,
          monthlyUserPriceKes: 4500,
          paidUsers: 1,
          setupFeeKes: 15000
        }
      }
    }
  });

  await prisma.companyRuntime.upsert({
    where: { companyId: company.id },
    update: {
      workspaceId: workspace.id,
      runtimeType: "PROFILE",
      hermesProfile: "kipekeestudio",
      status: "READY"
    },
    create: {
      workspaceId: workspace.id,
      companyId: company.id,
      runtimeType: "PROFILE",
      hermesProfile: "kipekeestudio",
      status: "READY",
      provisionedAt: new Date()
    }
  });

  await prisma.brandVoice.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      tone: "Clear, confident, warm, practical, and founder-led.",
      styleRules: "Use plain business language. Keep answers concise first, then offer next actions.",
      forbiddenWords: "Do not mention Hermes, internal infrastructure, worker, tenant, profiles, or private deployment details.",
      formattingPreferences: "Use short headings, bullets, tables, and checklists when useful."
    }
  });

  await prisma.businessRule.upsert({
    where: { id: `${company.id}-approval-first` },
    update: {},
    create: {
      id: `${company.id}-approval-first`,
      companyId: company.id,
      name: "Approval-first external actions",
      category: "security",
      ruleText: "AI employees may draft external actions, emails, and posts, but humans must approve before sending or publishing.",
      severity: "HIGH"
    }
  });

  const generalIndustry = industryTemplates.find((industry) => industry.key === "general-business");
  for (const collectionName of generalIndustry?.knowledgeCollections ?? ["Organization profile", "Company knowledge"]) {
    await prisma.knowledgeCollection.upsert({
      where: { id: `${company.id}-${slugify(collectionName)}` },
      update: {
        workspaceId: workspace.id,
        companyId: collectionName === "Organization profile" ? null : company.id,
        ownerType: collectionName === "Organization profile" ? "WORKSPACE" : "COMPANY",
        ownerId: collectionName === "Organization profile" ? workspace.id : company.id,
        name: collectionName,
        category: slugify(collectionName),
        sensitivity: "NORMAL"
      },
      create: {
        id: `${company.id}-${slugify(collectionName)}`,
        workspaceId: workspace.id,
        companyId: collectionName === "Organization profile" ? null : company.id,
        ownerType: collectionName === "Organization profile" ? "WORKSPACE" : "COMPANY",
        ownerId: collectionName === "Organization profile" ? workspace.id : company.id,
        name: collectionName,
        category: slugify(collectionName),
        sensitivity: "NORMAL"
      }
    });
  }

  for (const employeeName of kipekeeStudioEmployees) {
    const templateConfig = employeeTemplates.find((template) => template.name === employeeName);
    const template = await prisma.employeeTemplate.findUniqueOrThrow({
      where: { name: employeeName }
    });

    const employee = await prisma.companyEmployee.upsert({
      where: {
        id: `${company.slug}-${slugify(employeeName)}`
      },
      update: {
        roleInstructions: `${employeeName} works inside the ${company.name} company runtime and uses only approved company/workspace knowledge.`
      },
      create: {
        id: `${company.slug}-${slugify(employeeName)}`,
        companyId: company.id,
        templateId: template.id,
        displayName: employeeName,
        roleInstructions: `${employeeName} works inside the ${company.name} company runtime and uses only approved company/workspace knowledge.`
      }
    });

    await assignTemplateSkills(employee.id, templateConfig?.skills ?? []);
  }

  for (const workflowTemplate of starterWorkflowTemplates) {
    await installWorkflowTemplate(company.id, workflowTemplate.key);
  }

  const marketing = await prisma.companyEmployee.findFirstOrThrow({
    where: { companyId: company.id, displayName: "Marketing Manager" }
  });

  const collection = await prisma.knowledgeCollection.upsert({
    where: { id: "kipekee-company-positioning" },
    update: {},
    create: {
      id: "kipekee-company-positioning",
      workspaceId: workspace.id,
      companyId: company.id,
      ownerType: "COMPANY",
      ownerId: company.id,
      name: "Company positioning",
      category: "brand",
      sensitivity: "NORMAL"
    }
  });

  await prisma.artifact.upsert({
    where: { id: "kipekee-positioning-brief" },
    update: {},
    create: {
      id: "kipekee-positioning-brief",
      workspaceId: workspace.id,
      companyId: company.id,
      collectionId: collection.id,
      uploadedByUserId: admin.id,
      title: "Kipekee Networks positioning brief",
      kind: "document",
      storagePath: "company/kipekee-studio/artifacts/positioning-brief.md",
      storageProvider: "local",
      extractedText: "Kipekee Networks helps African businesses hire AI employees trained on their business.",
      memoryStatus: "MEMORY_INDEXED",
      access: {
        create: {
          employeeId: marketing.id,
          canUseAsMemory: true
        }
      },
      chunks: {
        create: {
          collectionId: collection.id,
          chunkIndex: 0,
          text: "Kipekee Networks helps African businesses hire AI employees trained on their business.",
          metadata: JSON.stringify({ source: "seed" })
        }
      }
    }
  });

  const connection = await prisma.integrationConnection.upsert({
    where: { id: "kipekee-email-planned" },
    update: {},
    create: {
      id: "kipekee-email-planned",
      ownerType: "COMPANY",
      ownerId: company.id,
      workspaceId: workspace.id,
      companyId: company.id,
      provider: "GMAIL",
      accountEmail: "info@kipekee.studio",
      displayName: "Kipekee Studio inbox",
      status: "PLANNED",
      scopes: JSON.stringify(["mail.read", "mail.draft", "mail.send.with_approval"]),
      connectedBy: admin.email
    }
  });

  const support = await prisma.companyEmployee.findFirst({
    where: { companyId: company.id, displayName: "Customer Support" }
  });
  if (support) {
    const mailbox = await prisma.mailbox.upsert({
      where: {
        companyId_emailAddress: {
          companyId: company.id,
          emailAddress: "info@kipekee.studio"
        }
      },
      update: {},
      create: {
        companyId: company.id,
        integrationConnectionId: connection.id,
        emailAddress: "info@kipekee.studio",
        displayName: "Kipekee Studio info inbox",
        provider: "GMAIL",
        status: "PLANNED"
      }
    });

    await prisma.mailboxAccess.upsert({
      where: {
        mailboxId_employeeId: {
          mailboxId: mailbox.id,
          employeeId: support.id
        }
      },
      update: {
        canRead: true,
        canDraft: true,
        canRequestSend: true,
        canSendWithoutApproval: false
      },
      create: {
        mailboxId: mailbox.id,
        employeeId: support.id,
        canRead: true,
        canDraft: true,
        canRequestSend: true,
        canSendWithoutApproval: false
      }
    });
  }

  const marketingWorkflow = await prisma.workflow.findFirst({
    where: { companyId: company.id, name: "Weekly marketing plan" }
  });
  await prisma.approvalRequest.upsert({
    where: { id: "approve-weekly-marketing-workflow" },
    update: {},
    create: {
      id: "approve-weekly-marketing-workflow",
      workspaceId: workspace.id,
      companyId: company.id,
      workflowId: marketingWorkflow?.id,
      title: "Approve weekly marketing plan workflow",
      details: "Marketing Manager will prepare a weekly plan and send it to the approval inbox before any external publishing.",
      requestedBy: "Marketing Manager"
    }
  });

  await prisma.invoice.upsert({
    where: { invoiceNo: "KN-0001" },
    update: {},
    create: {
      companyId: company.id,
      invoiceNo: "KN-0001",
      description: "Business Starter onboarding + 1 monthly user subscription",
      amountKes: 19500,
      status: "DRAFT"
    }
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      companyId: company.id,
      actor: "system",
      action: "seed.workspace.created",
      target: "Kipekee Studio",
      metadata: JSON.stringify({
        product: "Kipekee Networks",
        architecture: "workspace-company-runtime",
        tagline: "Hire AI employees trained on your business."
      })
    }
  });
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
