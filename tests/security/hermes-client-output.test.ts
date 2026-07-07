import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Hermes client output safety", () => {
  it("does not short-circuit greetings in profile mode", () => {
    const hermes = readFileSync(path.join(root, "lib/hermes.ts"), "utf8");

    expect(hermes).not.toContain("shortCircuit");
    expect(hermes).toContain('if (mode === "mock")');
    expect(hermes).toContain("? greetingFor(task)");
  });

  it("sanitizes provider failures before they reach chat users", () => {
    const hermes = readFileSync(path.join(root, "lib/hermes.ts"), "utf8");

    expect(hermes).toContain("isProviderFailure");
    expect(hermes).toContain("HTTP\\s*(429|401|403|500|502|503|504)");
    expect(hermes).not.toContain("Upgrade to Max for KES 500");
    expect(hermes).toContain("return safeClientError(task.employeeName)");
  });

  it("does not replace legitimate business answers about public repositories with a canned greeting", () => {
    const hermes = readFileSync(path.join(root, "lib/hermes.ts"), "utf8");
    const sanitizerSection = hermes.slice(
      hermes.indexOf("function containsInternalRuntimeLeak"),
      hermes.indexOf("async function writeCompanySoul")
    );

    expect(sanitizerSection).not.toContain("repo|repository|branch|git");
    expect(sanitizerSection).not.toContain("Kipekee Networks");
    expect(sanitizerSection).not.toContain("return greetingFor(task)");
    expect(sanitizerSection).toContain("internalRuntimeRefusal");
  });

  it("does not log raw Hermes prompts from command failures", () => {
    const serverLog = readFileSync(path.join(root, "lib/server-log.ts"), "utf8");
    const worker = readFileSync(path.join(root, "scripts/hermes-worker.ts"), "utf8");

    expect(serverLog).toContain("sanitizeLogText");
    expect(serverLog).toContain("Hermes command failed.");
    expect(serverLog).not.toContain("stack?.split");
    expect(worker).toContain("safeWorkerFailure");
    expect(worker).not.toContain("console.error(`[${workerId}] Failed job ${job.id}: ${error");
    expect(worker).not.toContain("error: error instanceof Error ? error.message : String(error)");
  });
});
