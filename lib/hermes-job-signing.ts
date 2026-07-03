import { createHmac, timingSafeEqual } from "crypto";

export type HermesJobSigningPayload = {
  companyId: string;
  employeeId: string;
  sessionId: string;
  prompt: string;
  employeeName: string;
  hermesProfile?: string | null;
  companyName: string;
  isolationTier: string;
  hermesNamespace?: string | null;
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

function canonicalPayload(payload: HermesJobSigningPayload) {
  return JSON.stringify({
    companyId: payload.companyId,
    employeeId: payload.employeeId,
    sessionId: payload.sessionId,
    prompt: payload.prompt,
    employeeName: payload.employeeName,
    hermesProfile: payload.hermesProfile ?? null,
    companyName: payload.companyName,
    isolationTier: payload.isolationTier,
    hermesNamespace: payload.hermesNamespace ?? null,
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
