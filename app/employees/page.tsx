import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import {
  approveEmployeeProfileSetupAction,
  createEmployeeAction,
  saveEmployeeProfileSetupAction
} from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isolationLabel } from "@/lib/isolation";
import { canManageCompany } from "@/lib/roles";
import { Activity, Database, Search, SlidersHorizontal } from "lucide-react";

export default async function EmployeesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const manager = canManageCompany(user);
  const query = (params.q ?? "").trim().toLowerCase();
  const status = params.status ?? "all";
  const [employees, templates] = await Promise.all([
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      include: {
        artifactAccess: true,
        loops: true,
        profileSetup: true,
        sessions: true,
        template: true
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.employeeTemplate.findMany({ orderBy: { name: "asc" } })
  ]);
  const visibleEmployees = employees.filter((employee) => {
    const matchesQuery =
      !query ||
      employee.displayName.toLowerCase().includes(query) ||
      employee.template.description.toLowerCase().includes(query) ||
      employee.template.name.toLowerCase().includes(query);
    const matchesStatus =
      status === "all" ||
      (status === "active" && employee.active) ||
      (status === "paused" && !employee.active);

    return matchesQuery && matchesStatus;
  });

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Workforce"
        title="AI employees"
        description="Reusable employee templates become company-specific employee instances with separate memory, sessions, permissions, and Hermes profile mapping."
      />
      <form className="mb-5 flex flex-col gap-3 rounded-lg border border-black/10 bg-white p-3 shadow-panel md:flex-row md:items-center md:justify-between">
        <label className="flex min-h-11 flex-1 items-center gap-3 rounded-md bg-paper px-3 text-sm text-graphite">
          <Search size={17} />
          <input
            className="w-full bg-transparent text-ink outline-none placeholder:text-graphite"
            defaultValue={params.q}
            name="q"
            placeholder="Search employees, tools, memory, or responsibilities"
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
              const scenarioCount = employee.loops.length;
              const lastSession = employee.sessions
                .map((session) => session.createdAt)
                .sort((a, b) => b.getTime() - a.getTime())[0];
              const setup = employee.profileSetup;
              const setupText =
                setup?.draftSoul ??
                [
                  `You are ${employee.displayName}, a Kipekee Networks AI employee assigned to ${user.company.name}.`,
                  "",
                  "Purpose:",
                  "- Help the company with practical business work in your role.",
                  "- Learn from approved company documents, SOPs, policies, examples, and user instructions.",
                  "- Ask clear follow-up questions when company context is missing.",
                  "",
                  "Behavior:",
                  "- Keep answers concise first, then offer details or next actions.",
                  "- Prepare drafts, plans, checklists, and recommendations.",
                  "- Ask for approval before sensitive external actions."
                ].join("\n");

              return (
                <Card key={employee.id}>
                  <div className="flex min-h-40 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-lg font-semibold">{employee.displayName}</h2>
                          <p className="mt-2 text-sm leading-6 text-graphite">{employee.template.description}</p>
                        </div>
                        <Badge tone={employee.active ? "success" : "neutral"}>{employee.active ? "Active" : "Paused"}</Badge>
                      </div>
                      <div className="mt-5 grid grid-cols-3 gap-2 border-y border-black/10 py-4 text-sm">
                        <EmployeeStat label="Chats" value={employee.sessions.length} />
                        <EmployeeStat label="Memory" value={memoryCount} />
                        <EmployeeStat label="Loops" value={scenarioCount} />
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-graphite">Last run</span>
                        <span className="font-semibold">{lastSession ? lastSession.toLocaleDateString() : "Not yet"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-graphite">Execution</span>
                        <span className="max-w-44 truncate font-semibold">
                          {employee.hermesProfile
                            ? "Dedicated employee profile"
                            : user.company.isolationTier === "SHARED"
                              ? "Shared scoped execution"
                              : "Pending setup"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-graphite">Setup</span>
                        <Badge
                          tone={
                            setup?.status === "APPROVED"
                              ? "success"
                              : setup?.status === "PENDING_APPROVAL"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {setup?.status?.replace("_", " ") ?? "DRAFT"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="inline-flex items-center gap-1 rounded-md bg-paper px-2.5 py-1 text-xs font-semibold text-graphite">
                          <Database size={13} />
                          {isolationLabel(user.company.isolationTier)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-paper px-2.5 py-1 text-xs font-semibold text-graphite">
                          <Activity size={13} />
                          Approval scoped
                        </span>
                      </div>
                      {manager ? (
                        <div className="rounded-md border border-black/10 bg-paper p-3">
                          <p className="text-sm font-semibold">Employee setup brief</p>
                          <p className="mt-1 text-xs leading-5 text-graphite">
                            This is the approved personality, role, and learning instruction that the local worker syncs into the employee profile.
                          </p>
                          <form action={saveEmployeeProfileSetupAction} className="mt-3 space-y-2">
                            <input name="employeeId" type="hidden" value={employee.id} />
                            <textarea
                              className="min-h-44 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm leading-6 outline-none"
                              name="draftSoul"
                              defaultValue={setupText}
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                className="min-h-10 rounded-md border border-black/10 bg-white px-3 text-sm font-semibold text-ink"
                                name="status"
                                value="DRAFT"
                              >
                                Save draft
                              </button>
                              <button
                                className="min-h-10 rounded-md bg-ink px-3 text-sm font-semibold text-paper"
                                name="status"
                                value="PENDING_APPROVAL"
                              >
                                Send for approval
                              </button>
                            </div>
                          </form>
                          <form action={approveEmployeeProfileSetupAction} className="mt-2">
                            <input name="employeeId" type="hidden" value={employee.id} />
                            <textarea className="hidden" name="draftSoul" readOnly value={setupText} />
                            <button className="min-h-10 w-full rounded-md bg-forest px-3 text-sm font-semibold text-white">
                              Approve setup
                            </button>
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
              description={employees.length ? "Adjust search or status to see more of this company's workforce." : "Add the first employee for this company. Employees are company-owned instances with separate memory, sessions, and permissions."}
            />
          )}
        </div>
        {manager ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Add employee</h2>
              <p className="mt-2 text-sm leading-6 text-graphite">
                Create a company-owned instance from a Kipekee employee template.
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
            <label className="block text-sm font-medium">
              Hermes profile
              <input className="mt-2 w-full rounded-md border border-black/10 px-3 py-2" name="hermesProfile" placeholder="Optional, only shown internally" />
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
