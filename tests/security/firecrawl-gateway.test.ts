import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const gateway = readFileSync(path.join(root, "lib/tool-gateway.ts"), "utf8");
const actions = readFileSync(path.join(root, "lib/actions.ts"), "utf8");
const composer = readFileSync(path.join(root, "components/ChatComposer.tsx"), "utf8");

describe("Firecrawl tool gateway", () => {
  it("keeps Firecrawl server-only and out of Hermes/browser direct access", () => {
    expect(gateway).toContain("process.env.FIRECRAWL_API_KEY");
    expect(gateway).toContain("https://api.firecrawl.dev/v1/scrape");
    expect(composer).not.toContain("FIRECRAWL_API_KEY");
    expect(composer).not.toContain("api.firecrawl.dev");
  });

  it("requires scoped employee skill permission and rate limits extraction", () => {
    expect(gateway).toContain("connector_firecrawl_extract");
    expect(gateway).toContain("employeeCanUseFirecrawl");
    expect(gateway).toContain("companyId, active: true");
    expect(gateway).toContain("allowedFirecrawlSkills");
  });

  it("blocks non-public URLs and logs connector outcomes", () => {
    expect(gateway).toContain("localhost");
    expect(gateway).toContain(".internal");
    expect(gateway).toContain("connector.firecrawl.extracted");
    expect(gateway).toContain("connector.firecrawl.denied");
    expect(gateway).toContain("connector.firecrawl.failed");
  });

  it("passes extracted source context through signed Hermes jobs", () => {
    expect(actions).toContain("extractUrlWithFirecrawl");
    expect(actions).toContain("firecrawlContextBlock");
    expect(actions).toContain("memoryContext: [memoryContext, sourceContext]");
    expect(actions).toContain("jobSignature: signHermesJob(jobData)");
  });
});
