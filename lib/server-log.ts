type LogFields = Record<string, unknown>;

function sanitizeLogText(value: string) {
  if (/Command failed:\s*hermes\b/i.test(value) || /\bhermes\s+-z:/i.test(value)) {
    if (/No inference provider configured/i.test(value)) {
      return "Hermes command failed: inference provider is not configured.";
    }
    if (/HTTP\s*429|Too Many Requests|rate.?limit/i.test(value)) {
      return "Hermes command failed: provider rate limit.";
    }
    if (/timed out|timeout/i.test(value)) {
      return "Hermes command failed: execution timed out.";
    }
    return "Hermes command failed.";
  }

  return value.replace(/(-z\s+)([\s\S]+)/g, "$1[redacted]");
}

function safeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeLogText(value.message)
    };
  }

  if (typeof value === "string") {
    return sanitizeLogText(value);
  }

  return value;
}

function log(level: "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const payload = {
    level,
    event,
    service: "kipekee-networks",
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, safeValue(value)]))
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logInfo(event: string, fields?: LogFields) {
  log("info", event, fields);
}

export function logWarn(event: string, fields?: LogFields) {
  log("warn", event, fields);
}

export function logError(event: string, error: unknown, fields: LogFields = {}) {
  log("error", event, { ...fields, error });
}

export function envPresence(keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, Boolean(process.env[key])]));
}
