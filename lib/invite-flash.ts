import { cookies } from "next/headers";

const maxAgeSeconds = 5 * 60;

const cookieNames = {
  onboarding: "kipekee_onboarding_invite",
  team: "kipekee_team_invite"
} as const;

type InviteFlashScope = keyof typeof cookieNames;

export async function setInviteFlash(scope: InviteFlashScope, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieNames[scope], token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
    path: scope === "onboarding" ? "/onboarding" : "/team"
  });
}

export async function getInviteFlash(scope: InviteFlashScope) {
  const cookieStore = await cookies();
  return cookieStore.get(cookieNames[scope])?.value ?? null;
}
