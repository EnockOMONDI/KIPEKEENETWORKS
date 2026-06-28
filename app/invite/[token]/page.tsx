import { Card } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { acceptInviteAction } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/security";
import { roleLabel } from "@/lib/roles";

export default async function InvitePage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await prisma.teamInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { company: true }
  });
  const invalid = !invite || invite.acceptedAt || invite.expiresAt < new Date();

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
              This invite is invalid, expired, or already accepted. Ask your company admin for a new invite.
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
              </div>
              {error ? (
                <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  Passwords must match and be at least 8 characters.
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
