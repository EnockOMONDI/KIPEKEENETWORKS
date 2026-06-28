import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createTeamInviteAction } from "@/lib/actions";
import { inviteUrl as buildInviteUrl } from "@/lib/app-url";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageTeam, roleLabel, roles } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function TeamPage({
  searchParams
}: {
  searchParams: Promise<{ invite?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  if (!canManageTeam(user)) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "asc" }
  });
  const pendingInvites = await prisma.teamInvite.findMany({
    where: { companyId: user.companyId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  const inviteUrl = params.invite ? buildInviteUrl(params.invite) : null;

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Company access"
        title="Team"
        description="Invite people into this company workspace and decide who can manage employees, knowledge, integrations, approvals, and billing."
      />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Invite team member</h2>
          <p className="mt-2 text-sm leading-6 text-graphite">
            Create an invite link. The person sets their own password before logging in.
          </p>
          {inviteUrl ? (
            <div className="mt-4 rounded-md border border-forest/20 bg-forest/5 p-3 text-sm">
              <p className="font-semibold text-forest">Invite link created</p>
              <p className="mt-2 break-all text-graphite">{inviteUrl}</p>
            </div>
          ) : null}
          <form action={createTeamInviteAction} className="mt-4 space-y-3">
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="name" placeholder="Full name" required />
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="email" placeholder="name@company.com" required type="email" />
            <select className="w-full rounded-md border border-black/10 px-3 py-2" name="role" defaultValue={roles.CLIENT_MEMBER}>
              <option value={roles.CLIENT_OWNER}>Client owner</option>
              <option value={roles.CLIENT_ADMIN}>Client admin</option>
              <option value={roles.CLIENT_MEMBER}>Team member</option>
            </select>
            <SubmitButton className="w-full" pendingText="Creating invite">
              Create invite link
            </SubmitButton>
          </form>
        </Card>
        <div className="space-y-3">
          {users.length ? (
            users.map((member) => (
              <Card key={member.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{member.name}</h2>
                    <p className="mt-1 text-sm text-graphite">{member.email}</p>
                  </div>
                  <Badge tone={member.role.includes("OWNER") || member.role.includes("ADMIN") ? "success" : "neutral"}>
                    {roleLabel(member.role)}
                  </Badge>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No team members yet"
              description="Create the first client owner or team member login for this company."
            />
          )}
          {pendingInvites.length ? (
            <Card>
              <h2 className="font-semibold">Pending invites</h2>
              <div className="mt-3 space-y-3">
                {pendingInvites.map((invite) => (
                  <div className="rounded-md bg-paper p-3" key={invite.id}>
                    <p className="font-semibold">{invite.name}</p>
                    <p className="mt-1 text-sm text-graphite">{invite.email}</p>
                    <p className="mt-1 text-xs text-graphite">Expires {invite.expiresAt.toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
