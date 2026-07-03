import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { prisma } from "./db";
import { clearRateLimit, enforceRateLimit, RateLimitError } from "./rate-limit";
import { hashToken, verifyPassword } from "./security";

const sessionCookieName = "kipekee_session";

export async function login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    await enforceRateLimit("login", [`email:${normalizedEmail}`]);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { ok: false, error: "Too many login attempts." };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { company: true }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Invalid email or password." };
  }

  await clearRateLimit("login", [`email:${normalizedEmail}`]);

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
