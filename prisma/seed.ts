import { PrismaClient } from "@prisma/client";
import {
  employeeTemplates,
  kipekeeStudioEmployees,
  onboardingPackages
} from "../lib/seed-data";
import { hashPassword } from "../lib/security";

const prisma = new PrismaClient();

const profileMap: Record<string, string> = {
  "CEO Assistant": "kipekeestudioceo",
  "Creative Director": "kipekeestudiocreative",
  "Marketing Manager": "kipekeestudiomarketing",
  "Proposal Writer": "kipekeestudioproposal",
  "Finance Assistant": "kipekeestudiofinance",
  "Software Engineer": "kipekeestudiosoftware",
  "Brand Manager": "kipekeestudiobrand",
  "Social Media Manager": "kipekeestudiosocial",
  "Research Analyst": "kipekeestudioresearch",
  "Customer Support": "kipekeestudiosupport",
  "Sales Assistant": "kipekeestudiosales"
};

async function main() {
  const adminEmail = process.env.KIPEKEE_ADMIN_EMAIL || "founder@kipekee.studio";
  const adminPassword = process.env.KIPEKEE_ADMIN_PASSWORD;

  if (!adminPassword || (process.env.NODE_ENV === "production" && adminPassword === "change-this-before-production")) {
    throw new Error("Set KIPEKEE_ADMIN_PASSWORD before seeding.");
  }

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

  for (const name of employeeTemplates) {
    await prisma.employeeTemplate.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `${name} trained on company documents, workflows, and approved memory.`,
        defaultTools: "chat,documents,memory,audit"
      }
    });
  }

  const businessStarter = await prisma.onboardingPackage.findUniqueOrThrow({
    where: { name: "Business Starter" }
  });

  const company = await prisma.company.upsert({
    where: { slug: "kipekee-studio" },
    update: {},
    create: {
      name: "Kipekee Studio",
      slug: "kipekee-studio",
      status: "ACTIVE",
      isolationTier: "PROFILE",
      hermesNamespace: "kipekeestudio",
      hermesHomePath: null,
      users: {
        create: [
          {
            name: "Dj Sean",
            email: adminEmail,
            passwordHash: hashPassword(adminPassword),
            role: "KIPEKEE_ADMIN"
          }
        ]
      },
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

  for (const employeeName of kipekeeStudioEmployees) {
    const template = await prisma.employeeTemplate.findUniqueOrThrow({
      where: { name: employeeName }
    });

    await prisma.companyEmployee.upsert({
      where: {
        id: `${company.slug}-${employeeName.toLowerCase().replaceAll(" ", "-")}`
      },
      update: {},
      create: {
        id: `${company.slug}-${employeeName.toLowerCase().replaceAll(" ", "-")}`,
        companyId: company.id,
        templateId: template.id,
        displayName: employeeName,
        hermesProfile: profileMap[employeeName]
      }
    });
  }

  const marketing = await prisma.companyEmployee.findFirstOrThrow({
    where: { companyId: company.id, displayName: "Marketing Manager" }
  });

  await prisma.artifact.upsert({
    where: { id: "kipekee-positioning-brief" },
    update: {},
    create: {
      id: "kipekee-positioning-brief",
      companyId: company.id,
      uploadedBy: adminEmail,
      title: "Kipekee Networks positioning brief",
      kind: "document",
      storagePath: "company/kipekee-studio/artifacts/positioning-brief.md",
      extractedText:
        "Kipekee Networks helps African businesses hire AI employees trained on their business.",
      memoryStatus: "MEMORY_INDEXED",
      access: {
        create: {
          employeeId: marketing.id,
          canUseAsMemory: true
        }
      }
    }
  });

  await prisma.businessLoop.upsert({
    where: { id: "weekly-marketing-plan" },
    update: {},
    create: {
      id: "weekly-marketing-plan",
      companyId: company.id,
      employeeId: marketing.id,
      name: "Weekly marketing plan",
      schedule: "Every Monday 09:00 Africa/Nairobi",
      status: "DRAFT",
      requiresApproval: true,
      outputTarget: "Approval inbox"
    }
  });

  await prisma.approvalRequest.upsert({
    where: { id: "approve-weekly-marketing-loop" },
    update: {},
    create: {
      id: "approve-weekly-marketing-loop",
      companyId: company.id,
      title: "Approve weekly marketing plan loop",
      details:
        "Marketing Manager will prepare a weekly plan every Monday and send it to the approval inbox before any external publishing.",
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
      companyId: company.id,
      actor: "system",
      action: "seed.workspace.created",
      target: "Kipekee Studio",
      metadata: JSON.stringify({
        product: "Kipekee Networks",
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
