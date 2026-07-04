import { createHmac, timingSafeEqual } from "crypto";

export type HermesJobSigningPayload = {
  workspaceId: string;
  companyId: string;
  companyRuntimeId: string;
  employeeId: string;
  sessionId: string;
  workflowId?: string | null;
  prompt: string;
  employeeName: string;
  companyName: string;
  runtimeProfile: string;
  skillKeys: string;
  allowedArtifactIds: string;
  allowedToolsets: string;
  memoryContext?: string | null;
};

function signingSecret() {
  const secret = process.env.KIPEKEE_JOB_SIGNING_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production" || process.env.KIPEKEE_HERMES_MODE === "profile") {
    throw new Error("KIPEKEE_JOB_SIGNING_SECRET is required when Hermes profile mode is active.");
  }

  return "dev-only-kipekee-job-signing-secret";
}

export function assertHermesJobSigningConfigured() {
  signingSecret();
}

function canonicalPayload(payload: HermesJobSigningPayload) {
  return JSON.stringify({
    workspaceId: payload.workspaceId,
    companyId: payload.companyId,
    companyRuntimeId: payload.companyRuntimeId,
    employeeId: payload.employeeId,
    sessionId: payload.sessionId,
    workflowId: payload.workflowId ?? null,
    prompt: payload.prompt,
    employeeName: payload.employeeName,
    companyName: payload.companyName,
    runtimeProfile: payload.runtimeProfile,
    skillKeys: payload.skillKeys,
    allowedArtifactIds: payload.allowedArtifactIds,
    allowedToolsets: payload.allowedToolsets,
    memoryContext: payload.memoryContext ?? null
  });
}

export function signHermesJob(payload: HermesJobSigningPayload) {
  return createHmac("sha256", signingSecret()).update(canonicalPayload(payload)).digest("hex");
}

export function verifyHermesJobSignature(payload: HermesJobSigningPayload, signature?: string | null) {
  if (!signature) {
    return false;
  }

  const expected = Buffer.from(signHermesJob(payload), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
