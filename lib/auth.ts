import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { prisma } from "./db";
import { clearRateLimit, enforceRateLimit, RateLimitError } from "./rate-limit";
import { hashToken, verifyPassword } from "./security";

const sessionCookieName = "kipekee_session";
const workspaceCookieName = "kipekee_workspace";
const companyCookieName = "kipekee_company";

export type AppUser = Awaited<ReturnType<typeof currentUser>> extends infer T ? NonNullable<T> : never;

const userContextSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  memberships: {
    where: { active: true },
    select: {
      id: true,
      workspaceId: true,
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          companies: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              workspaceId: true,
              name: true,
              slug: true,
              type: true,
              status: true,
              isolationTier: true,
              hermesNamespace: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "asc" }
  }
} as const;

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
    where: { email: normalizedEmail }
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
  cookieStore.delete(workspaceCookieName);
  cookieStore.delete(companyCookieName);
}

function buildUserContext(user: any, preferredWorkspaceId?: string, preferredCompanyId?: string) {
  if (!user) {
    return null;
  }

  const membership =
    user.memberships.find((item: any) => item.workspaceId === preferredWorkspaceId) ??
    user.memberships[0] ??
    null;
  const workspace = membership?.workspace ?? null;
  const company =
    workspace?.companies.find((item: any) => item.id === preferredCompanyId) ??
    workspace?.companies[0] ??
    null;

  return {
    ...user,
    workspace,
    workspaceId: workspace?.id ?? "",
    company,
    companyId: company?.id ?? "",
    memberRole: membership?.role ?? user.role
  };
}

async function hydrateUser(userId: string, preferredWorkspaceId?: string, preferredCompanyId?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userContextSelect
  });

  return buildUserContext(user, preferredWorkspaceId, preferredCompanyId);
}

export async function currentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const preferredWorkspaceId = cookieStore.get(workspaceCookieName)?.value;
  const preferredCompanyId = cookieStore.get(companyCookieName)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: userContextSelect
      }
    }
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return buildUserContext(session.user, preferredWorkspaceId, preferredCompanyId);
}

export async function requireUser(): Promise<any> {
  const user = await currentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireCompanyContext(): Promise<any> {
  const user = await requireUser();
  if (!user.workspace || !user.company) {
    redirect("/onboarding");
  }
  return user;
}
