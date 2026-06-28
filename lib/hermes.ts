import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type HermesTask = {
  companyId: string;
  companyName?: string;
  isolationTier?: string;
  hermesNamespace?: string | null;
  agentId: string;
  sessionId: string;
  prompt: string;
  hermesProfile?: string | null;
  employeeName?: string;
  allowedArtifactIds: string[];
  allowedToolsets: string[];
  memoryContext?: string;
};

export type HermesResult = {
  mode: "mock" | "profile";
  output: string;
  metadata: Record<string, string | number | boolean>;
};

export async function runHermesTask(task: HermesTask): Promise<HermesResult> {
  const mode = process.env.KIPEKEE_HERMES_MODE === "profile" ? "profile" : "mock";
  const sharedProfile = process.env.KIPEKEE_SHARED_HERMES_PROFILE || "kipekeenetworksworker";
  const profile = task.hermesProfile || (task.isolationTier === "SHARED" ? sharedProfile : null);

  if (mode === "mock") {
    return {
      mode,
      output:
        "Hermes bridge is in mock mode. Kipekee Networks has captured the scoped task and is ready to map this AI employee to a Kipekee-specific Hermes profile.",
      metadata: {
        companyId: task.companyId,
        agentId: task.agentId,
        sessionId: task.sessionId,
        allowedArtifacts: task.allowedArtifactIds.length,
        allowedToolsets: task.allowedToolsets.join(",")
      }
    };
  }

  if (!profile) {
    return {
      mode,
      output:
        "This Kipekee employee is not mapped to a Hermes execution profile yet. Use shared mode, provision company profiles, or assign a dedicated Hermes profile on the AI employees page.",
      metadata: {
        companyId: task.companyId,
        agentId: task.agentId,
        sessionId: task.sessionId
      }
    };
  }

  const hermesBin = process.env.HERMES_BIN || "/Users/djsean/.local/bin/hermes";
  const scopedPrompt = [
    `You are responding inside Kipekee Networks as ${task.employeeName ?? "a Kipekee AI employee"}.`,
    "Hermes is hidden infrastructure. Do not present yourself as Hermes.",
    `Company scope: ${task.companyName ?? task.companyId}.`,
    `Tenant namespace: ${task.hermesNamespace ?? task.companyId}.`,
    `Isolation tier: ${task.isolationTier ?? "SHARED"}.`,
    "Never use another company's memory, documents, sessions, or preferences.",
    "Use only the company memory context provided below. If it is insufficient, say what is missing.",
    "Do not send external messages or perform sensitive actions; prepare drafts and ask for approval.",
    "",
    "Allowed artifact IDs:",
    task.allowedArtifactIds.length ? task.allowedArtifactIds.join(", ") : "None",
    "",
    "Memory context:",
    task.memoryContext || "No approved memory context was attached.",
    "",
    "User request:",
    task.prompt
  ].join("\n");

  try {
    const { stdout, stderr } = await execFileAsync(
      hermesBin,
      ["--profile", profile, "-z", scopedPrompt],
      {
        cwd: process.cwd(),
        timeout: 120_000,
        maxBuffer: 1024 * 1024
      }
    );

    return {
      mode,
      output: stdout.trim() || stderr.trim() || "Hermes returned no text output.",
      metadata: {
        companyId: task.companyId,
        agentId: task.agentId,
        sessionId: task.sessionId,
        hermesProfile: profile,
        isolationTier: task.isolationTier ?? "SHARED",
        stderr: stderr.trim()
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      mode,
      output: `Hermes profile execution failed: ${message}`,
      metadata: {
        companyId: task.companyId,
        agentId: task.agentId,
        sessionId: task.sessionId,
        hermesProfile: profile,
        isolationTier: task.isolationTier ?? "SHARED"
      }
    };
  }
}

export async function runHermesLoop({
  companyId,
  companyName,
  isolationTier,
  hermesNamespace,
  employeeName,
  hermesProfile,
  loopName,
  memoryContext
}: {
  companyId: string;
  companyName?: string;
  isolationTier?: string;
  hermesNamespace?: string | null;
  employeeName: string;
  hermesProfile?: string | null;
  loopName: string;
  memoryContext?: string;
}) {
  return runHermesTask({
    companyId,
    companyName,
    isolationTier,
    hermesNamespace,
    agentId: employeeName,
    sessionId: `loop:${loopName}`,
    employeeName,
    hermesProfile,
    prompt: `Run the scheduled business loop: ${loopName}. Prepare the result for human approval.`,
    allowedArtifactIds: [],
    allowedToolsets: ["chat", "documents", "memory", "audit"],
    memoryContext
  });
}
