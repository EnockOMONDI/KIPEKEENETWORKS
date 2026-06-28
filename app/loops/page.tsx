import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createLoopAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCompany } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function LoopsPage() {
  const user = await requireUser();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  const [employees, loops] = await Promise.all([
    prisma.companyEmployee.findMany({ where: { companyId: user.companyId } }),
    prisma.businessLoop.findMany({
      where: { companyId: user.companyId },
      include: { employee: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Loop engineering"
        title="Scheduled business loops"
        description="Loops move Kipekee Networks beyond chat. Each loop has an owner employee, schedule, approval rule, and output destination."
      />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Create loop</h2>
          <form action={createLoopAction} className="mt-4 space-y-3">
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="name" placeholder="Daily CEO brief" required />
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="schedule" placeholder="Every weekday 08:00 Africa/Nairobi" required />
            <select className="w-full rounded-md border border-black/10 px-3 py-2" name="employeeId" required>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.displayName}
                </option>
              ))}
            </select>
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="outputTarget" placeholder="Approval inbox" required />
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked name="requiresApproval" type="checkbox" />
              Requires approval
            </label>
            <SubmitButton className="w-full" pendingText="Creating loop">
              Create loop
            </SubmitButton>
          </form>
        </Card>
        <div className="space-y-3">
          {loops.length ? (
            loops.map((loop) => (
              <Card key={loop.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{loop.name}</h2>
                  <Badge tone={loop.status === "ACTIVE" ? "success" : "warning"}>{loop.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-graphite">{loop.schedule}</p>
                <p className="mt-2 text-sm text-graphite">Owner: {loop.employee.displayName}</p>
                <p className="mt-2 text-sm text-graphite">Output: {loop.outputTarget}</p>
                <form action="/api/loops/run" className="mt-4" method="post">
                  <input name="loopId" type="hidden" value={loop.id} />
                  <SubmitButton pendingText="Running loop">Run now</SubmitButton>
                </form>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No scheduled loops yet"
              description="Create recurring work for an AI employee, such as weekly marketing plans, finance reminders, lead research, or CEO briefs."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
