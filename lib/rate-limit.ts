import { headers } from "next/headers";
import { prisma } from "./db";
import { hashToken } from "./security";

export type RateLimitAction =
  | "login"
  | "invite_open"
  | "invite_accept"
  | "team_invite_create"
  | "chat_create"
  | "connector_firecrawl_extract"
  | "connector_prismfy_search"
  | "artifact_upload"
  | "loop_run"
  | "integration_request"
  | "company_onboarding"
  | "approval_create"
  | "approval_decide"
  | "employee_create"
  | "employee_profile_save"
  | "employee_profile_approve"
  | "invoice_create"
  | "team_invite_revoke";

const policies: Record<RateLimitAction, { limit: number; windowMs: number }> = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  invite_open: { limit: 30, windowMs: 15 * 60 * 1000 },
  invite_accept: { limit: 8, windowMs: 30 * 60 * 1000 },
  team_invite_create: { limit: 15, windowMs: 60 * 60 * 1000 },
  chat_create: { limit: 60, windowMs: 60 * 60 * 1000 },
  connector_firecrawl_extract: { limit: 30, windowMs: 60 * 60 * 1000 },
  connector_prismfy_search: { limit: 40, windowMs: 60 * 60 * 1000 },
  artifact_upload: { limit: 20, windowMs: 60 * 60 * 1000 },
  loop_run: { limit: 20, windowMs: 60 * 60 * 1000 },
  integration_request: { limit: 20, windowMs: 60 * 60 * 1000 },
  company_onboarding: { limit: 20, windowMs: 60 * 60 * 1000 },
  approval_create: { limit: 40, windowMs: 60 * 60 * 1000 },
  approval_decide: { limit: 60, windowMs: 60 * 60 * 1000 },
  employee_create: { limit: 30, windowMs: 60 * 60 * 1000 },
  employee_profile_save: { limit: 60, windowMs: 60 * 60 * 1000 },
  employee_profile_approve: { limit: 60, windowMs: 60 * 60 * 1000 },
  invoice_create: { limit: 30, windowMs: 60 * 60 * 1000 },
  team_invite_revoke: { limit: 30, windowMs: 60 * 60 * 1000 }
};

export class RateLimitError extends Error {
  constructor(public readonly action: RateLimitAction) {
    super("Rate limit exceeded.");
  }
}

export function rateLimitKey(action: RateLimitAction, subjects: string[]) {
  const subject = subjects.filter(Boolean).map((item) => item.trim().toLowerCase()).join("|") || "anonymous";
  return {
    key: hashToken(`${action}:${subject}`),
    subject
  };
}

async function requestIp() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    headerStore.get("cf-connecting-ip") ??
    headerStore.get("x-real-ip") ??
    forwardedFor ??
    "unknown"
  );
}

export async function enforceRateLimit(action: RateLimitAction, subjects: string[]) {
  const policy = policies[action];
  const ip = await requestIp();
  const { key, subject } = rateLimitKey(action, [...subjects, `ip:${ip}`]);
  const now = new Date();
  const resetAt = new Date(now.getTime() + policy.windowMs);
  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!existing || existing.resetAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      update: {
        action,
        subject,
        count: 1,
        resetAt
      },
      create: {
        key,
        action,
        subject,
        count: 1,
        resetAt
      }
    });
    return;
  }

  if (existing.count >= policy.limit) {
    throw new RateLimitError(action);
  }

  await prisma.rateLimitBucket.update({
    where: { key },
    data: {
      count: { increment: 1 }
    }
  });
}

export async function clearRateLimit(action: RateLimitAction, subjects: string[]) {
  const ip = await requestIp();
  const { key } = rateLimitKey(action, [...subjects, `ip:${ip}`]);
  await prisma.rateLimitBucket.deleteMany({ where: { key } });
}
