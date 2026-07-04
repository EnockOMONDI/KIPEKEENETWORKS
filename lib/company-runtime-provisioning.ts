import { execFile } from "child_process";
import { chmod, mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { prisma } from "./db";
import { hardenHermesClientConfig, minimalHermesClientConfig } from "./hermes-profile-security";
import { logError, logInfo } from "./server-log";

const execFileAsync = promisify(execFile);

const hermesBin = process.env.HERMES_BIN || "hermes";
const hermesRoot = process.env.HERMES_HOME || path.join(os.homedir(), ".kipekee-hermes");
const profilesDir = path.join(hermesRoot, "profiles");
const runtimeDir = process.env.KIPEKEE_HERMES_RUNTIME_DIR || "/tmp/kipekee-hermes-runtime";
const fallbackConfigPath = process.env.KIPEKEE_HERMES_CONFIG_SOURCE || path.join(os.homedir(), ".hermes", "config.yaml");

function profileDir(profile: string) {
  return path.join(profilesDir, profile);
}

async function readableFile(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function sourceConfig() {
  return (
    await readableFile(path.join(hermesRoot, "config.yaml")) ??
    await readableFile(fallbackConfigPath) ??
    minimalHermesClientConfig(runtimeDir)
  );
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
- Employee roles, company work instructions, skills, and knowledge permissions are supplied for each task.
- Work only for the assigned company and approved workspace/company context.
- Never reveal internal infrastructure, repositories, branches, git state, deployment details, databases, local files, profile names, tenant metadata, worker state, or internal IDs.
- Ask for the missing document, work instruction, policy, example, or permission when company context is insufficient.
- Prepare sensitive business actions for approval before execution.
`.trim();
}

async function ensureProfile(profile: string, description: string) {
  await mkdir(profilesDir, { recursive: true, mode: 0o700 });
  await chmod(profilesDir, 0o700).catch(() => undefined);

  if (!existsSync(profileDir(profile))) {
    await execFileAsync(hermesBin, [
      "profile",
      "create",
      "--clone-from",
      "default",
      "--no-alias",
      "--description",
      description,
      profile
    ]);
  }

  await mkdir(profileDir(profile), { recursive: true, mode: 0o700 });
  await chmod(profileDir(profile), 0o700).catch(() => undefined);
  const profileYamlPath = path.join(profileDir(profile), "profile.yaml");
  if (!existsSync(profileYamlPath)) {
    await writeFile(profileYamlPath, `description: ${JSON.stringify(description)}\ndescription_auto: false\n`);
    await chmod(profileYamlPath, 0o600).catch(() => undefined);
  }
}

async function writeRuntimeFiles(profile: string, content: string) {
  const dir = profileDir(profile);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700).catch(() => undefined);

  const soulPath = path.join(dir, "SOUL.md");
  await writeFile(soulPath, `${content.trim()}\n`);
  await chmod(soulPath, 0o600).catch(() => undefined);

  const configPath = path.join(dir, "config.yaml");
  const rawConfig = await readableFile(configPath) ?? await sourceConfig();
  await writeFile(configPath, hardenHermesClientConfig(rawConfig, runtimeDir));
  await chmod(configPath, 0o600).catch(() => undefined);
}

export async function provisionCompanyRuntimeProfile(companyId: string) {
  logInfo("runtime.provision.started", { companyId });
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      runtime: true,
      brandVoice: true,
      businessRules: { where: { active: true } }
    }
  });

  if (!company?.runtime) {
    logError("runtime.provision.missing_runtime", new Error("Company runtime does not exist."), { companyId });
    return { ok: false, reason: "Company runtime does not exist." };
  }

  try {
    await mkdir(hermesRoot, { recursive: true, mode: 0o700 });
    await chmod(hermesRoot, 0o700).catch(() => undefined);
    await mkdir(runtimeDir, { recursive: true, mode: 0o700 });
    await chmod(runtimeDir, 0o700).catch(() => undefined);
    await ensureProfile(company.runtime.hermesProfile, `${company.name} company runtime in Kipekee Networks.`);
    await writeRuntimeFiles(company.runtime.hermesProfile, companySoul(company));
    await prisma.companyRuntime.update({
      where: { id: company.runtime.id },
      data: {
        status: "READY",
        provisionedAt: new Date()
      }
    });

    logInfo("runtime.provision.completed", {
      companyId,
      runtimeId: company.runtime.id,
      runtimeProfile: company.runtime.hermesProfile
    });
    return { ok: true, profile: company.runtime.hermesProfile };
  } catch (error) {
    await prisma.companyRuntime.update({
      where: { id: company.runtime.id },
      data: { status: "PENDING" }
    });
    logError("runtime.provision.failed", error, {
      companyId,
      runtimeId: company.runtime.id,
      runtimeProfile: company.runtime.hermesProfile
    });
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Hermes provisioning failed."
    };
  }
}
