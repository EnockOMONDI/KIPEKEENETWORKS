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
    expect(hermes).toContain("Upgrade to Max for KES 500");
    expect(hermes).toContain("return safeClientError(task.employeeName)");
  });
});
