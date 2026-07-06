import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { playbookMarkdown, skillPlaybooks } from "../../lib/skill-playbooks";

const root = process.cwd();

describe("Eve-inspired runtime skills", () => {
  it("defines serious playbooks for Proposal Writing and Tender/Grant Tracking", () => {
    expect(skillPlaybooks["proposal-writing"]).toBeDefined();
    expect(skillPlaybooks["tender-grant-tracking"]).toBeDefined();

    const proposal = playbookMarkdown(skillPlaybooks["proposal-writing"]);
    const tender = playbookMarkdown(skillPlaybooks["tender-grant-tracking"]);

    expect(proposal).toContain("## Approval rules");
    expect(proposal).toContain("firecrawl.extractUrl");
    expect(tender).toContain("Fit score");
    expect(tender).toContain("Do not submit applications");
  });

  it("generates runtime package files from database state, not as source of truth", () => {
    const runtimePackage = readFileSync(path.join(root, "lib/runtime-package.ts"), "utf8");

    expect(runtimePackage).toContain("The Kipekee database is authoritative");
    expect(runtimePackage).toContain("instructions.md");
    expect(runtimePackage).toContain("policy.yaml");
    expect(runtimePackage).toContain("skills/${playbook.key}.md");
    expect(runtimePackage).toContain("tools/firecrawl-extract.md");
    expect(runtimePackage).toContain("connections/firecrawl.md");
    expect(runtimePackage).toContain("schedules/README.md");
  });

  it("includes expanded skill playbooks in Hermes prompt composition", () => {
    const hermes = readFileSync(path.join(root, "lib/hermes.ts"), "utf8");
    const worker = readFileSync(path.join(root, "scripts/hermes-worker.ts"), "utf8");

    expect(hermes).toContain("Expanded skill playbooks:");
    expect(worker).toContain("playbookPromptSection");
  });
});
