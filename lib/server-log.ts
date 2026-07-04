type LogFields = Record<string, unknown>;

function safeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.split("\n").slice(0, 6).join("\n")
    };
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
