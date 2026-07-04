import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createTeamInviteAction, revokeTeamInviteAction } from "@/lib/actions";
import { inviteUrl as buildInviteUrl } from "@/lib/app-url";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInviteFlash } from "@/lib/invite-flash";
import { requestOrigin } from "@/lib/request-security";
import { canManageTeam, roleLabel, roles } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const user = await requireCompanyContext();
  const origin = await requestOrigin();
  const inviteToken = await getInviteFlash("team");
  if (!canManageTeam(user)) {
    redirect("/dashboard");
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: user.workspaceId },
    select: {
      id: true,
      role: true,
      user: { select: { email: true, name: true } }
    },
    orderBy: { createdAt: "asc" }
  });
  const pendingInvites = await prisma.teamInvite.findMany({
    where: { companyId: user.companyId, acceptedAt: null, revokedAt: null },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      maxOpenCount: true,
      name: true,
      openCount: true,
      revokedAt: true
    },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  const inviteUrl = inviteToken ? buildInviteUrl(inviteToken, origin) : null;

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Organisation access"
        title="Team"
        description="Invite people into this organisation workspace and decide who can manage employees, knowledge, integrations, approvals, and billing."
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
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="email" placeholder="name@organisation.com" required type="email" />
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
          {members.length ? (
            members.map((member) => (
              <Card key={member.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{member.user.name}</h2>
                    <p className="mt-1 text-sm text-graphite">{member.user.email}</p>
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
              description="Create the first client owner or team member login for this organisation."
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
                    <p className="mt-1 text-xs text-graphite">
                      Expires {invite.expiresAt.toLocaleDateString()} · Opens {invite.openCount}/{invite.maxOpenCount}
                    </p>
                    {invite.revokedAt ? (
                      <Badge tone="danger">Revoked</Badge>
                    ) : (
                      <form action={revokeTeamInviteAction} className="mt-3">
                        <input name="inviteId" type="hidden" value={invite.id} />
                        <SubmitButton pendingText="Revoking" variant="secondary">
                          Revoke invite
                        </SubmitButton>
                      </form>
                    )}
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
