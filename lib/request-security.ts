import { headers } from "next/headers";

export async function assertSameOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!origin || !host) {
    return;
  }

  const originHost = new URL(origin).host;
  if (originHost !== host) {
    throw new Error("Invalid request origin.");
  }
}

export async function requestOrigin() {
  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const proto = forwardedProto ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!host) {
    return null;
  }

  return `${proto}://${host}`;
}

export function assertValidEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address.");
  }
}
