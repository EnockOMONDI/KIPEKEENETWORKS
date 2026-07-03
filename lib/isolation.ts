export const isolationTiers = [
  {
    value: "SHARED",
    label: "Shared infrastructure",
    description: "Normal clients. Shared Hermes worker with strict tenant-scoped prompts, data access, and approvals."
  },
  {
    value: "PROFILE",
    label: "Separate Hermes profiles",
    description: "Higher-risk clients. Dedicated Hermes profiles per company and employee role."
  },
  {
    value: "CONTAINER",
    label: "Separate Hermes home/container",
    description: "Sensitive clients. Dedicated Hermes home path or container boundary per company."
  },
  {
    value: "DEPLOYMENT",
    label: "Fully isolated deployment",
    description: "Enterprise clients. Separate deployment paid for by the client."
  }
] as const;

export type IsolationTier = (typeof isolationTiers)[number]["value"];

const isolationTierValues = new Set<string>(isolationTiers.map((tier) => tier.value));

export function safeIsolationTier(value: string | null | undefined): IsolationTier {
  return isolationTierValues.has(value ?? "") ? (value as IsolationTier) : "PROFILE";
}

export function companyNamespace(slug: string) {
  return slug.replace(/[^a-z0-9]/g, "").slice(0, 32) || "company";
}

export function hermesProfileName(namespace: string, employeeName: string) {
  const role = employeeName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 28);
  return `${namespace}${role}`.slice(0, 48);
}

export function hermesHomePath(namespace: string) {
  return path.join(os.homedir(), ".kipekee", "hermes-homes", namespace);
}

export function isolationLabel(value: string) {
  return isolationTiers.find((tier) => tier.value === value)?.label ?? value;
}
import os from "os";
import path from "path";
