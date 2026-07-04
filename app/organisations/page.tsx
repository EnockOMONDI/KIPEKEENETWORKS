import Link from "next/link";
import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isolationLabel } from "@/lib/isolation";
import { canManageCompany } from "@/lib/roles";
import { Building2, Database, ShieldCheck, Users } from "lucide-react";

export default async function OrganisationsPage() {
  const user = await requireCompanyContext();
  const manager = canManageCompany(user);
  const organisations = await prisma.company.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      status: true,
      isolationTier: true,
      runtime: { select: { hermesProfile: true, status: true } },
      _count: {
        select: {
          artifacts: true,
          employees: true,
          sessions: true,
          workflows: true
        }
      }
    }
  });

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Workspace"
        title="Organisations"
        description="A workspace can hold one organisation or many businesses, brands, foundations, branches, departments, or programmes. Each organisation keeps its work, knowledge, employees, and instructions separate by default."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<Building2 size={18} />} label="Organisations" value={organisations.length} />
        <Metric icon={<Users size={18} />} label="Employees" value={organisations.reduce((sum, item) => sum + item._count.employees, 0)} />
        <Metric icon={<Database size={18} />} label="Knowledge files" value={organisations.reduce((sum, item) => sum + item._count.artifacts, 0)} />
        <Metric icon={<ShieldCheck size={18} />} label="Default isolation" value="Separate" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {organisations.length ? (
          organisations.map((organisation) => (
            <Card key={organisation.id}>
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-graphite">{organisation.type.toLowerCase()}</p>
                  <h2 className="mt-1 text-xl font-semibold">{organisation.name}</h2>
                  <p className="mt-2 text-sm text-graphite">{organisation.slug} · {isolationLabel(organisation.isolationTier)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={organisation.status === "ACTIVE" ? "success" : "warning"}>{organisation.status}</Badge>
                  <Badge tone={organisation.runtime?.status === "ACTIVE" || organisation.runtime?.status === "READY" ? "success" : "warning"}>
                    {organisation.runtime?.status === "ACTIVE" || organisation.runtime?.status === "READY" ? "AI setup ready" : "AI setup pending"}
                  </Badge>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <MiniStat label="Employees" value={organisation._count.employees} />
                <MiniStat label="Instructions" value={organisation._count.workflows} />
                <MiniStat label="Documents" value={organisation._count.artifacts} />
                <MiniStat label="Chats" value={organisation._count.sessions} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link className="inline-flex min-h-10 items-center rounded-2xl bg-forest px-4 text-sm font-semibold text-white" href="/chat">
                  Open workspace
                </Link>
                <Link className="inline-flex min-h-10 items-center rounded-2xl border border-violetline px-4 text-sm font-semibold text-forest" href="/company-settings">
                  Organisation settings
                </Link>
              </div>
              {manager ? (
                <p className="mt-4 text-xs text-graphite">
                  Technical execution details are managed by the platform and hidden from client-facing workspaces.
                </p>
              ) : null}
            </Card>
          ))
        ) : (
          <EmptyState title="No organisations yet" description="Create the first organisation during onboarding, then add employees, documents, work instructions, and integrations." />
        )}
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f5f0ff] text-forest">{icon}</span>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-graphite">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-paper p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-graphite">{label}</p>
    </div>
  );
}
