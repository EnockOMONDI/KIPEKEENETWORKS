import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createEmployeeAction, saveEmployeeRoleAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCompany } from "@/lib/roles";
import { Activity, Database, Search, SlidersHorizontal } from "lucide-react";

export default async function EmployeesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireCompanyContext();
  const params = await searchParams;
  const manager = canManageCompany(user);
  const query = (params.q ?? "").trim().toLowerCase();
  const status = params.status ?? "all";
  const [employees, templates] = await Promise.all([
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        active: true,
        createdAt: true,
        displayName: true,
        roleInstructions: true,
        artifactAccess: { select: { canUseAsMemory: true } },
        mailboxAccess: { select: { id: true } },
        skills: { select: { id: true, skill: { select: { name: true } } } },
        sessions: { select: { id: true, createdAt: true } },
        template: { select: { description: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.employeeTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);
  const visibleEmployees = employees.filter((employee) => {
    const matchesQuery =
      !query ||
      employee.displayName.toLowerCase().includes(query) ||
      employee.template.description.toLowerCase().includes(query) ||
      employee.skills.some((item) => item.skill.name.toLowerCase().includes(query));
    const matchesStatus =
      status === "all" ||
      (status === "active" && employee.active) ||
      (status === "paused" && !employee.active);

    return matchesQuery && matchesStatus;
  });

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole || user.role}>
      <PageHeader
        eyebrow="Workforce"
        title="AI employees"
        description="Employees are organisation-owned roles. They use assigned skills, company work instructions, knowledge, and mailbox permissions."
      />
      <form className="mb-5 flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 shadow-panel md:flex-row md:items-center md:justify-between">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-md bg-paper px-3 text-sm text-graphite">
          <Search size={17} />
          <input
            className="w-full bg-transparent text-ink outline-none placeholder:text-graphite"
            defaultValue={params.q}
            name="q"
            placeholder="Search employees, skills, memory, or responsibilities"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-ink">
          <SlidersHorizontal size={17} />
          <select className="bg-transparent outline-none" defaultValue={status} name="status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <button className="min-h-11 rounded-md bg-ink px-4 text-sm font-semibold text-paper">
          Apply
        </button>
      </form>
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4 md:grid-cols-2">
          {visibleEmployees.length ? (
            visibleEmployees.map((employee) => {
              const memoryCount = employee.artifactAccess.filter((access) => access.canUseAsMemory).length;
              const lastSession = employee.sessions
                .map((session) => session.createdAt)
                .sort((a, b) => b.getTime() - a.getTime())[0];

              return (
                <Card key={employee.id}>
                  <div className="flex min-h-40 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">{employee.displayName}</h2>
                          <p className="mt-2 text-sm leading-6 text-graphite">{organisationCopy(employee.template.description)}</p>
                        </div>
                        <Badge tone={employee.active ? "success" : "neutral"}>{employee.active ? "Active" : "Paused"}</Badge>
                      </div>
                      <div className="mt-5 grid grid-cols-4 gap-2 border-y border-black/10 py-4 text-sm">
                        <EmployeeStat label="Chats" value={employee.sessions.length} />
                        <EmployeeStat label="Memory" value={memoryCount} />
                        <EmployeeStat label="Skills" value={employee.skills.length} />
                        <EmployeeStat label="Mailboxes" value={employee.mailboxAccess.length} />
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-graphite">Last run</span>
                        <span className="font-semibold">{lastSession ? lastSession.toLocaleDateString() : "Not yet"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {employee.skills.map((item) => (
                          <span className="rounded-md bg-paper px-2.5 py-1 text-xs font-semibold text-graphite" key={item.id}>
                            {item.skill.name}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 rounded-md bg-paper px-2.5 py-1 text-xs font-semibold text-graphite">
                          <Database size={13} />
                          Organisation scoped
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-paper px-2.5 py-1 text-xs font-semibold text-graphite">
                          <Activity size={13} />
                          Approval scoped
                        </span>
                      </div>
                      {manager ? (
                        <div className="rounded-md border border-black/10 bg-paper p-3">
                          <p className="text-sm font-semibold">Role instructions</p>
                          <p className="mt-1 text-xs leading-5 text-graphite">
                            These instructions travel with the employee role. They define how this employee should behave inside the organisation.
                          </p>
                          <form action={saveEmployeeRoleAction} className="mt-3 space-y-2">
                            <input name="employeeId" type="hidden" value={employee.id} />
                            <textarea
                              className="min-h-36 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm leading-6 outline-none"
                              name="roleInstructions"
                              defaultValue={employee.roleInstructions ?? ""}
                            />
                            <SubmitButton className="w-full" pendingText="Saving role">
                              Save role instructions
                            </SubmitButton>
                          </form>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <EmptyState
              title={employees.length ? "No employees match this filter" : "No AI employees yet"}
              description={employees.length ? "Adjust search or status to see more employees." : "Add the first employee for this organisation."}
            />
          )}
        </div>
        {manager ? (
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Add employee</h2>
                <p className="mt-2 text-sm leading-6 text-graphite">
                  Create an organisation-owned employee from a reusable template.
                </p>
              </div>
              <Badge>{templates.length} templates</Badge>
            </div>
            <form action={createEmployeeAction} className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Template
                <select className="mt-2 w-full rounded-md border border-black/10 px-3 py-2" name="templateId">
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Display name
                <input className="mt-2 w-full rounded-md border border-black/10 px-3 py-2" name="displayName" required />
              </label>
              <SubmitButton className="w-full" pendingText="Creating employee">
                Create employee
              </SubmitButton>
            </form>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

function EmployeeStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs text-graphite">{label}</p>
    </div>
  );
}

function organisationCopy(value: string) {
  return value.replace(/\bcompany\b/gi, "organisation");
}
