import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const iterations = 120_000;
const keyLength = 32;
const digest = "sha256";

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");
  return `pbkdf2:${digest}:${iterations}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) {
    return false;
  }

  const [scheme, storedDigest, storedIterations, salt, hash] = storedHash.split(":");
  if (scheme !== "pbkdf2" || storedDigest !== digest) {
    return false;
  }

  const candidate = pbkdf2Sync(
    password,
    salt,
    Number(storedIterations),
    keyLength,
    storedDigest
  ).toString("hex");

  const candidateBuffer = Buffer.from(candidate, "hex");
  const storedBuffer = Buffer.from(hash, "hex");

  return candidateBuffer.length === storedBuffer.length && timingSafeEqual(candidateBuffer, storedBuffer);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
