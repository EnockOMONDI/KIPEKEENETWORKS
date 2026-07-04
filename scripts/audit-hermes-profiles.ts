import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import os from "os";
import path from "path";
import { auditHermesClientConfig } from "../lib/hermes-profile-security";

const hermesRoot = process.env.HERMES_HOME || path.join(os.homedir(), ".kipekee-hermes");
const profilesDir = path.join(hermesRoot, "profiles");
const runtimeDir = process.env.KIPEKEE_HERMES_RUNTIME_DIR || "/tmp/kipekee-hermes-runtime";

if (!existsSync(profilesDir)) {
  console.error(`Hermes profiles directory does not exist: ${profilesDir}`);
  process.exit(1);
}

const failures: string[] = [];

function mode(pathname: string) {
  return statSync(pathname).mode & 0o777;
}

if (!existsSync(path.join(hermesRoot, "config.yaml"))) {
  failures.push("root: missing config.yaml");
} else {
  const rootProblems = auditHermesClientConfig(readFileSync(path.join(hermesRoot, "config.yaml"), "utf8"), runtimeDir);
  for (const problem of rootProblems) {
    failures.push(`root: ${problem}`);
  }
  if (mode(path.join(hermesRoot, "config.yaml")) !== 0o600) {
    failures.push("root: config.yaml must be mode 600");
  }
}

if (mode(hermesRoot) !== 0o700) {
  failures.push("root: Hermes home must be mode 700");
}
if (mode(profilesDir) !== 0o700) {
  failures.push("root: profiles directory must be mode 700");
}

for (const entry of readdirSync(profilesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) {
    continue;
  }

  const profileDir = path.join(profilesDir, entry.name);
  if (mode(profileDir) !== 0o700) {
    failures.push(`${entry.name}: profile directory must be mode 700`);
  }

  const configPath = path.join(profileDir, "config.yaml");
  const profileYamlPath = path.join(profileDir, "profile.yaml");
  if (!existsSync(profileYamlPath)) {
    failures.push(`${entry.name}: missing profile.yaml`);
  }
  if (!existsSync(configPath)) {
    failures.push(`${entry.name}: missing config.yaml`);
    continue;
  }
  if (mode(configPath) !== 0o600) {
    failures.push(`${entry.name}: config.yaml must be mode 600`);
  }

  const problems = auditHermesClientConfig(readFileSync(configPath, "utf8"), runtimeDir);
  for (const problem of problems) {
    failures.push(`${entry.name}: ${problem}`);
  }
}

if (failures.length) {
  console.error("Hermes client profile audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Hermes client profile audit passed.");
