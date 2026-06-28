import Link from "next/link";
import { AppShell, Badge, Card, PageHeader } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isolationLabel } from "@/lib/isolation";
import { roleLabel } from "@/lib/roles";

export default async function DashboardPage() {
  const user = await requireUser();
  const [employees, artifacts, loops, approvals, conversations, recentEmployees] = await Promise.all([
    prisma.companyEmployee.count({ where: { companyId: user.companyId } }),
    prisma.artifact.count({ where: { companyId: user.companyId } }),
    prisma.businessLoop.count({ where: { companyId: user.companyId } }),
    prisma.approvalRequest.count({ where: { companyId: user.companyId, status: "PENDING" } }),
    prisma.session.count({ where: { companyId: user.companyId } }),
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      include: {
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 3
        }
      },
      orderBy: { createdAt: "asc" },
      take: 6
    })
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Home"
        title={`Welcome back, ${user.name}`}
        description={`${user.company.name} has an AI workforce trained on approved company knowledge.`}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="AI employees" value={employees} />
        <Metric label="Knowledge files" value={artifacts} />
        <Metric label="Conversations" value={conversations} />
        <Metric label="Awaiting approval" value={approvals} />
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
                      {employee.sessions.length ? `Answered ${employee.sessions.length} recent chats` : "Ready for work"}
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
            <p>Role: {roleLabel(user.role)}</p>
            <p>Isolation: {isolationLabel(user.company.isolationTier)}</p>
            <p>Namespace: {user.company.hermesNamespace ?? user.company.slug}</p>
            <p>Scheduled activity: {loops}</p>
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
