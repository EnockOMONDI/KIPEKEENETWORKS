import { Card } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { acceptInviteAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
import { hashToken } from "@/lib/security";
import { roleLabel } from "@/lib/roles";

export const metadata = {
  robots: {
    follow: false,
    index: false
  }
};

export default async function InvitePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const tokenHash = hashToken(token);
  let rateLimited = false;
  try {
    await enforceRateLimit("invite_open", [`invite:${tokenHash}`]);
  } catch (limitError) {
    if (limitError instanceof RateLimitError) {
      rateLimited = true;
    } else {
      throw limitError;
    }
  }
  const invite = await prisma.teamInvite.findUnique({
    where: { tokenHash },
    include: { company: true }
  });
  const exceededOpenLimit = Boolean(invite && invite.openCount >= invite.maxOpenCount);
  if (invite && !rateLimited && !exceededOpenLimit && !invite.acceptedAt && !invite.revokedAt && invite.expiresAt >= new Date()) {
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: {
        lastOpenedAt: new Date(),
        openedAt: invite.openedAt ?? new Date(),
        openCount: { increment: 1 }
      }
    });
  }
  const invalid = rateLimited || !invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date() || exceededOpenLimit;
  const status = rateLimited
    ? "temporarily unavailable"
    : invite?.acceptedAt
    ? "already accepted"
    : invite?.revokedAt
      ? "revoked"
      : invite && invite.expiresAt < new Date()
        ? "expired"
        : exceededOpenLimit
          ? "no longer available"
        : "invalid";

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5">
      <section className="w-full max-w-lg">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-copper">
            Kipekee Networks
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Accept invite</h1>
          {invalid ? (
            <div className="mt-5 rounded-md bg-red-50 px-3 py-3 text-sm leading-6 text-red-700">
              This invite is {status}. Ask your company admin for a new invite.
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-md bg-paper p-4 text-sm leading-6 text-graphite">
                <p>
                  Company: <span className="font-semibold text-ink">{invite.company.name}</span>
                </p>
                <p>
                  Name: <span className="font-semibold text-ink">{invite.name}</span>
                </p>
                <p>
                  Email: <span className="font-semibold text-ink">{invite.email}</span>
                </p>
                <p>
                  Role: <span className="font-semibold text-ink">{roleLabel(invite.role)}</span>
                </p>
                <p>
                  Expires: <span className="font-semibold text-ink">{invite.expiresAt.toLocaleDateString()}</span>
                </p>
                <p>
                  Opens: <span className="font-semibold text-ink">{invite.openCount + 1}</span>
                </p>
              </div>
              {error ? (
                <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error === "existing"
                    ? "This email is already attached to another company workspace. Ask Kipekee support to review access."
                    : error === "rate-limit"
                      ? "Too many attempts. Please wait before trying again."
                      : "Passwords must match and be at least 8 characters."}
                </div>
              ) : null}
              <form action={acceptInviteAction} className="mt-5 space-y-3">
                <input name="token" type="hidden" value={token} />
                <label className="block text-sm font-medium">
                  Password
                  <input
                    className="mt-2 w-full rounded-md border border-black/10 px-3 py-2"
                    name="password"
                    required
                    type="password"
                  />
                </label>
                <label className="block text-sm font-medium">
                  Confirm password
                  <input
                    className="mt-2 w-full rounded-md border border-black/10 px-3 py-2"
                    name="confirmPassword"
                    required
                    type="password"
                  />
                </label>
                <SubmitButton className="w-full" pendingText="Creating account">
                  Create account
                </SubmitButton>
              </form>
            </>
          )}
        </Card>
      </section>
    </main>
  );
}
