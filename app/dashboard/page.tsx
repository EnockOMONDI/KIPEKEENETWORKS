import Link from "next/link";
import { AppShell, Badge, Card, PageHeader } from "@/components/AppShell";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isolationLabel } from "@/lib/isolation";
import { isKipekeeAdmin, roleLabel } from "@/lib/roles";

export default async function DashboardPage() {
  const user = await requireCompanyContext();
  const platformAdmin = isKipekeeAdmin(user);
  const [employees, artifacts, workflows, approvals, conversations, companies, recentEmployees, runtime] = await Promise.all([
    prisma.companyEmployee.count({ where: { companyId: user.companyId } }),
    prisma.artifact.count({ where: { OR: [{ companyId: user.companyId }, { workspaceId: user.workspaceId, companyId: null }] } }),
    prisma.workflow.count({ where: { companyId: user.companyId } }),
    prisma.approvalRequest.count({ where: { companyId: user.companyId, status: "PENDING" } }),
    prisma.session.count({ where: { companyId: user.companyId } }),
    prisma.company.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true }
    }),
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        displayName: true,
        sessions: {
          orderBy: { createdAt: "desc" },
          select: { id: true },
          take: 3
        },
        skills: { select: { id: true } }
      },
      orderBy: { createdAt: "asc" },
      take: 6
    }),
    prisma.companyRuntime.findUnique({
      where: { companyId: user.companyId },
      select: { hermesProfile: true, status: true }
    })
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole || user.role}>
      <PageHeader
        eyebrow="Home"
        title={`Welcome back, ${user.name}`}
        description={`${user.workspace.name} contains ${companies.length} organisation${companies.length === 1 ? "" : "s"}. ${user.company.name} is currently selected.`}
      />
      <div className="grid gap-4 md:grid-cols-5">
        <Metric label="Organisations" value={companies.length} />
        <Metric label="AI employees" value={employees} />
        <Metric label="Knowledge files" value={artifacts} />
        <Metric label="Workflows" value={workflows} />
        <Metric label="Approvals" value={approvals} />
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Recently active employees</h2>
            <Link className="text-sm font-semibold text-forest" href="/chat">Open chats</Link>
          </div>
          <div className="mt-4 divide-y divide-black/10">
            {recentEmployees.map((employee) => (
              <div className="flex items-center justify-between gap-4 py-4" key={employee.id}>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-md bg-paper font-semibold text-forest">
                    {employee.displayName.slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-semibold">{employee.displayName}</p>
                    <p className="mt-1 text-sm text-graphite">
                      {employee.skills.length} skill{employee.skills.length === 1 ? "" : "s"} assigned · {employee.sessions.length ? `${employee.sessions.length} recent chats` : "ready"}
                    </p>
                  </div>
                </div>
                <Badge tone={employee.sessions.length ? "success" : "neutral"}>
                  {employee.sessions.length ? "Working" : "Idle"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Workspace profile</h2>
          <div className="mt-4 space-y-3 text-sm text-graphite">
            <p>Workspace: {user.workspace.name}</p>
            <p>Organisation: {user.company.name}</p>
            <p>Role: {roleLabel(user.memberRole || user.role)}</p>
            <p>Isolation: {isolationLabel(user.company.isolationTier)}</p>
            <p>Organisation runtime: <span className="font-semibold text-ink">{runtime?.status ?? "Missing"}</span></p>
            {platformAdmin ? <p>Runtime profile: {runtime?.hermesProfile ?? user.company.hermesNamespace ?? user.company.slug}</p> : null}
            <p>Conversations: {conversations}</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-graphite">{label}</p>
    </Card>
  );
}
