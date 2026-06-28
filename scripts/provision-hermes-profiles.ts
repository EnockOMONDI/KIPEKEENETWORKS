import { execFileSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { prisma } from "../lib/db";
import { companyNamespace, hermesProfileName } from "../lib/isolation";

const hermesBin = process.env.HERMES_BIN || "/Users/djsean/.local/bin/hermes";
const hermesRoot = "/Users/djsean/.hermes";
const profilesDir = path.join(hermesRoot, "profiles");
const sharedProfile = process.env.KIPEKEE_SHARED_HERMES_PROFILE || "kipekeenetworksworker";

function profileDir(profile: string) {
  return path.join(profilesDir, profile);
}

function ensureProfile(profile: string, description: string) {
  if (!existsSync(profileDir(profile))) {
    execFileSync(hermesBin, [
      "profile",
      "create",
      "--clone-from",
      "default",
      "--no-alias",
      "--description",
      description,
      profile
    ], {
      stdio: "inherit"
    });
  }
}

function writeSoul(profile: string, content: string) {
  mkdirSync(profileDir(profile), { recursive: true });
  writeFileSync(path.join(profileDir(profile), "SOUL.md"), `${content.trim()}\n`);
}

async function main() {
  ensureProfile(
    sharedProfile,
    "Shared Kipekee Networks worker for normal tenant-scoped client tasks."
  );
  writeSoul(
    sharedProfile,
    `
# Kipekee Networks Shared Worker

You are hidden infrastructure for Kipekee Networks. Customers must experience you as their assigned Kipekee AI employee, never as Hermes.

Rules:
- Obey the company scope, tenant namespace, employee role, allowed artifacts, and allowed tools in each request.
- Never use or infer data from another company.
- If memory context is missing, ask for the missing document or policy.
- Draft sensitive external actions for approval instead of executing them.
- Keep responses practical for African businesses and Kipekee Networks clients.
`
  );

  const companies = await prisma.company.findMany({
    where: { isolationTier: "PROFILE" },
    include: { employees: true }
  });

  for (const company of companies) {
    const namespace = company.hermesNamespace ?? companyNamespace(company.slug);

    if (!company.hermesNamespace) {
      await prisma.company.update({
        where: { id: company.id },
        data: { hermesNamespace: namespace }
      });
    }

    for (const employee of company.employees) {
      const profile = employee.hermesProfile ?? hermesProfileName(namespace, employee.displayName);
      ensureProfile(profile, `${employee.displayName} for ${company.name} in Kipekee Networks.`);
      writeSoul(
        profile,
        `
# ${employee.displayName} - ${company.name}

You are ${employee.displayName}, a Kipekee Networks AI employee assigned to ${company.name}.

Rules:
- You work only for ${company.name}.
- Hermes is hidden infrastructure; never present yourself as Hermes.
- Use only the company-scoped memory and artifacts passed to you.
- Do not access, mention, or infer information from any other client.
- Prepare sensitive business actions for approval before execution.
- When the company context is insufficient, say exactly what document, SOP, policy, or permission is missing.
`
      );

      if (!employee.hermesProfile) {
        await prisma.companyEmployee.update({
          where: { id: employee.id },
          data: { hermesProfile: profile }
        });
      }
    }
  }

  console.log(`Provisioned shared profile and ${companies.length} profile-isolated compan${companies.length === 1 ? "y" : "ies"}.`);
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
