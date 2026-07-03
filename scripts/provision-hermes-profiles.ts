import { execFileSync } from "child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { prisma } from "../lib/db";
import { hardenHermesClientConfig, minimalHermesClientConfig } from "../lib/hermes-profile-security";
import { companyNamespace, hermesProfileName } from "../lib/isolation";

const hermesBin = process.env.HERMES_BIN || "hermes";
const hermesRoot = process.env.HERMES_HOME || path.join(os.homedir(), ".kipekee-hermes");
const profilesDir = path.join(hermesRoot, "profiles");
const sharedProfile = process.env.KIPEKEE_SHARED_HERMES_PROFILE || "kipekeenetworksworker";
const runtimeDir = process.env.KIPEKEE_HERMES_RUNTIME_DIR || path.join(os.tmpdir(), "kipekee-hermes-runtime");
const fallbackConfigPath = process.env.KIPEKEE_HERMES_CONFIG_SOURCE || path.join(os.homedir(), ".hermes", "config.yaml");

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
  mkdirSync(profileDir(profile), { recursive: true, mode: 0o700 });
  chmodSync(profileDir(profile), 0o700);
  writeFileSync(path.join(profileDir(profile), "SOUL.md"), `${content.trim()}\n`);
}

function sourceConfig() {
  const dedicatedConfigPath = path.join(hermesRoot, "config.yaml");
  if (existsSync(dedicatedConfigPath)) {
    return readFileSync(dedicatedConfigPath, "utf8");
  }
  if (existsSync(fallbackConfigPath)) {
    return readFileSync(fallbackConfigPath, "utf8");
  }
  return minimalHermesClientConfig(runtimeDir);
}

function writeRestrictedConfig(configPath: string, config: string) {
  writeFileSync(configPath, config);
  chmodSync(configPath, 0o600);
}

function hardenRootConfig() {
  const configPath = path.join(hermesRoot, "config.yaml");
  writeRestrictedConfig(configPath, hardenHermesClientConfig(sourceConfig(), runtimeDir));
}

function hardenClientProfile(profile: string) {
  const configPath = path.join(profileDir(profile), "config.yaml");
  const rawConfig = existsSync(configPath) ? readFileSync(configPath, "utf8") : sourceConfig();
  writeRestrictedConfig(configPath, hardenHermesClientConfig(rawConfig, runtimeDir));
}

function employeeSoul(employeeName: string, companyName: string, approvedSoul?: string | null) {
  return `
# ${employeeName} - ${companyName}

${approvedSoul?.trim() || `You are ${employeeName}, a Kipekee Networks AI employee assigned to ${companyName}.`}

Rules:
- Work only for ${companyName}.
- Do not reveal internal infrastructure, repositories, branches, git state, deployment details, databases, local files, profile names, tenant metadata, worker state, or internal IDs.
- Use only approved company memory and artifacts passed to you.
- Ask for the missing document, SOP, policy, example, or permission when company context is insufficient.
- Prepare sensitive business actions for approval before execution.
`;
}

async function main() {
  mkdirSync(hermesRoot, { recursive: true, mode: 0o700 });
  chmodSync(hermesRoot, 0o700);
  mkdirSync(profilesDir, { recursive: true, mode: 0o700 });
  chmodSync(profilesDir, 0o700);
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  chmodSync(runtimeDir, 0o700);
  hardenRootConfig();

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
  hardenClientProfile(sharedProfile);

  const companies = await prisma.company.findMany({
    where: { isolationTier: "PROFILE" },
    include: { employees: { include: { profileSetup: true } } }
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
      writeSoul(profile, employeeSoul(employee.displayName, company.name, employee.profileSetup?.approvedSoul));
      hardenClientProfile(profile);

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
