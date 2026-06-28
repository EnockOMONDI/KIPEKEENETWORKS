import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { prisma } from "./db";
import { hashToken, verifyPassword } from "./security";

const sessionCookieName = "kipekee_session";
const loginWindowMs = 15 * 60 * 1000;
const maxLoginAttempts = 8;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(email: string) {
  return email.trim().toLowerCase();
}

function isRateLimited(email: string) {
  const key = rateLimitKey(email);
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + loginWindowMs });
    return false;
  }

  attempt.count += 1;
  return attempt.count > maxLoginAttempts;
}

function clearRateLimit(email: string) {
  loginAttempts.delete(rateLimitKey(email));
}

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (isRateLimited(normalizedEmail)) {
    return { ok: false, error: "Too many login attempts." };
  }

  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    include: { company: true }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }
  clearRateLimit(normalizedEmail);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });

  return { ok: true };
}

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashToken(token) }
    });
  }
  cookieStore.delete(sessionCookieName);
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: { company: true }
      }
    }
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
