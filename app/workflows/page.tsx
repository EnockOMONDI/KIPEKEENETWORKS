import { AppShell, Badge, Card, EmptyState, Notice, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createWorkflowAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pageNotice } from "@/lib/page-notices";
import { canManageCompany } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function WorkflowsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireCompanyContext();
  const params = await searchParams;
  const notice = pageNotice("workflows", params.error);
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  const [employees, workflows] = await Promise.all([
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true }
    }),
    prisma.workflow.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        description: true,
        name: true,
        schedule: true,
        status: true,
        triggerType: true,
        employees: { select: { employee: { select: { displayName: true } } } },
        steps: {
          select: { id: true, stepType: true, skill: { select: { name: true } } },
          orderBy: { stepOrder: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole || user.role}>
      <PageHeader
        eyebrow="Work instructions"
        title="Company work instructions"
        description="Work instructions capture how this organisation wants work done. AI employees combine these instructions with assigned skills, approved knowledge, and approval rules."
      />
      {notice ? <Notice description={notice.description} title={notice.title} tone={notice.tone} /> : null}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Create work instruction</h2>
          <form action={createWorkflowAction} className="mt-4 space-y-3">
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="name" placeholder="Weekly marketing plan" required />
            <textarea className="min-h-24 w-full rounded-md border border-black/10 px-3 py-2" name="description" placeholder="How should this work be prepared, reviewed, and approved?" required />
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="schedule" placeholder="Every Monday 09:00 Africa/Nairobi" />
            <select className="w-full rounded-md border border-black/10 px-3 py-2" name="employeeId" required>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.displayName}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked name="requiresApproval" type="checkbox" />
              Requires approval
            </label>
            <SubmitButton className="w-full" pendingText="Creating instruction">
              Create work instruction
            </SubmitButton>
          </form>
        </Card>
        <div className="space-y-3">
          {workflows.length ? (
            workflows.map((workflow) => (
              <Card key={workflow.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{workflow.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-graphite">{workflow.description}</p>
                  </div>
                  <Badge tone={workflow.status === "ACTIVE" ? "success" : "warning"}>{workflow.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-graphite">Trigger: {workflow.triggerType}{workflow.schedule ? ` · ${workflow.schedule}` : ""}</p>
                <p className="mt-2 text-sm text-graphite">Employees: {workflow.employees.map((item) => item.employee.displayName).join(", ") || "None assigned"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {workflow.steps.map((step) => (
                    <span className="rounded-md bg-paper px-2.5 py-1 text-xs font-semibold text-graphite" key={step.id}>
                      {step.skill?.name ?? step.stepType}
                    </span>
                  ))}
                </div>
                <form action="/api/loops/run" className="mt-4" method="post">
                  <input name="workflowId" type="hidden" value={workflow.id} />
                  <SubmitButton pendingText="Running instruction">Run now</SubmitButton>
                </form>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No work instructions yet"
              description="Create instructions for an AI employee, such as how to prepare weekly marketing plans, proposal drafts, finance reminders, lead research, or CEO briefs."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
