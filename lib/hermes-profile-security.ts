const forbiddenClientToolsets = new Set([
  "hermes-cli",
  "shell",
  "bash",
  "filesystem",
  "file",
  "files",
  "read",
  "write",
  "edit",
  "computer-use"
]);

function replaceTopLevelBlock(config: string, key: string, replacement: string) {
  const lines = config.split(/\r?\n/);
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    if (lines[index] === `${key}:`) {
      output.push(replacement.trimEnd());
      index += 1;
      while (index < lines.length && (/^\s/.test(lines[index]) || lines[index].startsWith("-") || lines[index] === "")) {
        index += 1;
      }
      continue;
    }
    output.push(lines[index]);
    index += 1;
  }

  return output.join("\n");
}

function replaceIndentedBlock(config: string, key: string, replacement: string) {
  const lines = config.split(/\r?\n/);
  const output: string[] = [];
  const replacementBlock = replacement.trimEnd();
  let replaced = false;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line === `  ${key}:` || line.startsWith(`  ${key}: `)) {
      if (!replaced) {
        output.push(replacementBlock);
        replaced = true;
      }
      index += 1;
      if (line === `  ${key}:`) {
        while (index < lines.length && (/^    /.test(lines[index]) || /^  - /.test(lines[index]) || lines[index] === "")) {
          index += 1;
        }
      }
      continue;
    }

    output.push(line);
    index += 1;
  }

  if (replaced) {
    return output.join("\n");
  }

  return config.replace(/^agent:\n/m, `agent:\n${replacement.endsWith("\n") ? replacement : `${replacement}\n`}`);
}

function topLevelList(config: string, key: string) {
  const lines = config.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `${key}:`);
  if (start === -1) {
    return [];
  }

  const values: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || /^\s/.test(line) || line.startsWith("-")) {
      const value = line.replace(/^\s*-\s*/, "").trim();
      if (value) {
        values.push(value);
      }
      continue;
    }
    break;
  }

  return values;
}

export function hardenHermesClientConfig(config: string, runtimeDir: string) {
  let nextConfig = replaceTopLevelBlock(config, "toolsets", "toolsets:\n  - web\n");
  nextConfig = replaceIndentedBlock(nextConfig, "disabled_toolsets", "  disabled_toolsets:\n    - hermes-cli\n");
  nextConfig = nextConfig.replace(/cwd:\s*.+/g, `cwd: ${runtimeDir}`);
  nextConfig = nextConfig.replace(/persistent_shell:\s*true/g, "persistent_shell: false");

  if (!/persistent_shell:\s*false/.test(nextConfig)) {
    nextConfig = nextConfig.replace(/^terminal:\n/m, "terminal:\n  persistent_shell: false\n");
  }

  if (!/cwd:\s*.+/.test(nextConfig)) {
    nextConfig = nextConfig.replace(/^terminal:\n/m, `terminal:\n  cwd: ${runtimeDir}\n`);
  }

  return nextConfig;
}

export function minimalHermesClientConfig(runtimeDir: string) {
  return hardenHermesClientConfig(
    `
model:
  default: ''
  provider: ''
toolsets:
  - web
agent:
  max_turns: 90
  disabled_toolsets:
    - hermes-cli
terminal:
  backend: local
  cwd: ${runtimeDir}
  timeout: 180
  persistent_shell: false
browser:
  allow_private_urls: false
display:
  streaming: true
`.trimStart(),
    runtimeDir
  );
}

export function auditHermesClientConfig(config: string, runtimeDir?: string) {
  const problems: string[] = [];
  const toolsets = topLevelList(config, "toolsets");
  const forbidden = toolsets.filter((toolset) => forbiddenClientToolsets.has(toolset));

  if (!toolsets.length) {
    problems.push("missing top-level toolsets block");
  }
  if (forbidden.length) {
    problems.push(`forbidden client toolset enabled: ${forbidden.join(", ")}`);
  }
  if (!toolsets.includes("web")) {
    problems.push("web toolset is not enabled");
  }
  if (!/disabled_toolsets:\n(?:.*\n)*?\s*-\s*hermes-cli/m.test(config)) {
    problems.push("hermes-cli is not explicitly disabled");
  }
  if (!/persistent_shell:\s*false/.test(config)) {
    problems.push("persistent_shell is not false");
  }
  if (runtimeDir && !config.includes(`cwd: ${runtimeDir}`)) {
    problems.push("cwd is not pinned to the Kipekee Hermes runtime directory");
  }

  return problems;
}
