import { execFileSync } from "child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { prisma } from "../lib/db";
import { hardenHermesClientConfig, minimalHermesClientConfig } from "../lib/hermes-profile-security";
import { companyNamespace, companyRuntimeProfileName } from "../lib/isolation";

const hermesBin = process.env.HERMES_BIN || "hermes";
const hermesRoot = process.env.HERMES_HOME || path.join(os.homedir(), ".kipekee-hermes");
const profilesDir = path.join(hermesRoot, "profiles");
const sharedProfile = process.env.KIPEKEE_SHARED_HERMES_PROFILE || "kipekeenetworksworker";
const runtimeDir = process.env.KIPEKEE_HERMES_RUNTIME_DIR || "/tmp/kipekee-hermes-runtime";
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

  const profileYamlPath = path.join(profileDir(profile), "profile.yaml");
  if (!existsSync(profileYamlPath)) {
    writeFileSync(
      profileYamlPath,
      `description: ${JSON.stringify(description)}\ndescription_auto: false\n`
    );
    chmodSync(profileYamlPath, 0o600);
  }
}

function writeSoul(profile: string, content: string) {
  mkdirSync(profileDir(profile), { recursive: true, mode: 0o700 });
  chmodSync(profileDir(profile), 0o700);
  const soulPath = path.join(profileDir(profile), "SOUL.md");
  writeFileSync(soulPath, `${content.trim()}\n`);
  chmodSync(soulPath, 0o600);
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

function companySoul(company: {
  name: string;
  type: string;
  brandVoice?: { tone: string; styleRules: string; formattingPreferences: string; forbiddenWords: string } | null;
  businessRules: Array<{ name: string; ruleText: string }>;
}) {
  return `
# ${company.name} Company Runtime

This Hermes profile is the isolated company runtime for ${company.name}. It represents the company, not an individual AI employee.

Company type: ${company.type}

Brand voice:
${company.brandVoice ? [
  `- Tone: ${company.brandVoice.tone}`,
  `- Style: ${company.brandVoice.styleRules}`,
  `- Formatting: ${company.brandVoice.formattingPreferences}`,
  company.brandVoice.forbiddenWords ? `- Forbidden wording: ${company.brandVoice.forbiddenWords}` : ""
].filter(Boolean).join("\n") : "- Not configured yet."}

Business rules:
${company.businessRules.length ? company.businessRules.map((rule) => `- ${rule.name}: ${rule.ruleText}`).join("\n") : "- Approval-first behavior for external actions."}

Runtime rules:
- Employee roles, workflows, skills, and knowledge permissions are supplied by Kipekee Networks for each task.
- Work only for the assigned company and approved workspace/company context.
- Never reveal internal infrastructure, repositories, branches, git state, deployment details, databases, local files, profile names, tenant metadata, worker state, or internal IDs.
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
- Obey the company scope, employee role, workflow, skills, allowed artifacts, and allowed tools in each request.
- Never use or infer data from another company.
- If memory context is missing, ask for the missing document or policy.
- Draft sensitive external actions for approval instead of executing them.
- Keep responses practical for African businesses and Kipekee Networks clients.
`
  );
  hardenClientProfile(sharedProfile);

  const companies = await prisma.company.findMany({
    where: { isolationTier: { in: ["PROFILE", "CONTAINER", "DEPLOYMENT"] } },
    include: { runtime: true, brandVoice: true, businessRules: { where: { active: true } } }
  });

  for (const company of companies) {
    const runtimeNamespace = company.hermesNamespace ?? companyNamespace(company.slug);
    const runtimeProfile = company.runtime?.hermesProfile ?? companyRuntimeProfileName(runtimeNamespace);

    if (!company.hermesNamespace) {
      await prisma.company.update({
        where: { id: company.id },
        data: { hermesNamespace: runtimeNamespace }
      });
    }

    const runtime = await prisma.companyRuntime.upsert({
      where: { companyId: company.id },
      update: {
        workspaceId: company.workspaceId,
        runtimeType: company.isolationTier,
        hermesProfile: runtimeProfile,
        status: "READY",
        provisionedAt: new Date()
      },
      create: {
        workspaceId: company.workspaceId,
        companyId: company.id,
        runtimeType: company.isolationTier,
        hermesProfile: runtimeProfile,
        status: "READY",
        provisionedAt: new Date()
      }
    });

    ensureProfile(runtime.hermesProfile, `${company.name} company runtime in Kipekee Networks.`);
    writeSoul(runtime.hermesProfile, companySoul(company));
    hardenClientProfile(runtime.hermesProfile);
  }

  console.log(`Provisioned shared profile and ${companies.length} company runtime profile${companies.length === 1 ? "" : "s"}.`);
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
