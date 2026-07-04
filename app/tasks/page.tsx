import Link from "next/link";
import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createApprovalAction, decideApprovalAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCompany } from "@/lib/roles";
import { CheckCircle2, Clock3, Inbox, Workflow } from "lucide-react";

export default async function TasksPage() {
  const user = await requireCompanyContext();
  const manager = canManageCompany(user);
  const [approvals, jobs, workflows] = await Promise.all([
    prisma.approvalRequest.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, details: true, requestedBy: true, status: true, title: true },
      take: 20
    }),
    prisma.hermesJob.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, employeeName: true, sessionId: true, status: true },
      take: 10
    }),
    prisma.workflow.findMany({
      where: { companyId: user.companyId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true },
      take: 6
    })
  ]);
  const pending = approvals.filter((approval) => approval.status === "PENDING").length;

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Tasks"
        title="Work queue"
        description="Track human approvals, recent AI work, and workflow activity in one operational view."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={<Inbox size={18} />} label="Pending approvals" tone={pending ? "warning" : "success"} value={pending} />
        <Metric icon={<Clock3 size={18} />} label="Recent AI jobs" value={jobs.length} />
        <Metric icon={<Workflow size={18} />} label="Active workflows" value={workflows.filter((workflow) => workflow.status === "ACTIVE").length} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Create approval task</h2>
          <p className="mt-2 text-sm leading-6 text-graphite">Use this when a decision, send action, or sensitive output needs human review.</p>
          <form action={createApprovalAction} className="mt-4 space-y-3">
            <input className="min-h-11 w-full rounded-2xl border border-violetline px-3 py-2" name="title" placeholder="Approve proposal draft" required />
            <textarea className="min-h-32 w-full rounded-2xl border border-violetline px-3 py-2" name="details" placeholder="What should be reviewed?" required />
            <SubmitButton className="w-full" pendingText="Creating task">
              Create task
            </SubmitButton>
          </form>
        </Card>

        <div className="space-y-3">
          {approvals.length ? (
            approvals.map((approval) => (
              <Card key={approval.id}>
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <h2 className="font-semibold">{approval.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-graphite">{approval.details}</p>
                    <p className="mt-2 text-xs text-graphite">Requested by {approval.requestedBy} · {approval.createdAt.toLocaleDateString()}</p>
                  </div>
                  <Badge tone={approval.status === "PENDING" ? "warning" : approval.status === "APPROVED" ? "success" : "danger"}>
                    {approval.status}
                  </Badge>
                </div>
                {approval.status === "PENDING" && manager ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={decideApprovalAction}>
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="status" type="hidden" value="APPROVED" />
                      <SubmitButton pendingText="Approving">Approve</SubmitButton>
                    </form>
                    <form action={decideApprovalAction}>
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="status" type="hidden" value="REJECTED" />
                      <SubmitButton pendingText="Rejecting" variant="secondary">Reject</SubmitButton>
                    </form>
                  </div>
                ) : null}
              </Card>
            ))
          ) : (
            <EmptyState title="No tasks yet" description="Approvals, workflow tasks, and review items will appear here." />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Recent AI work</h2>
          <div className="mt-4 space-y-3">
            {jobs.length ? (
              jobs.map((job) => (
                <Link className="flex items-center justify-between gap-3 rounded-2xl border border-violetline px-3 py-3 text-sm hover:bg-paper" href={`/chat?session=${job.sessionId}`} key={job.id}>
                  <span>{job.employeeName}</span>
                  <Badge tone={job.status === "COMPLETED" ? "success" : job.status === "FAILED" ? "danger" : "warning"}>{job.status}</Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-6 text-graphite">No AI jobs have been queued yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Workflow activity</h2>
          <div className="mt-4 space-y-3">
            {workflows.length ? (
              workflows.map((workflow) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-violetline px-3 py-3 text-sm" key={workflow.id}>
                  <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-forest" /> {workflow.name}</span>
                  <Badge tone={workflow.status === "ACTIVE" ? "success" : "neutral"}>{workflow.status}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-graphite">No workflows have been created yet.</p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, tone = "neutral", value }: { icon: React.ReactNode; label: string; tone?: "success" | "warning" | "neutral"; value: number | string }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-forest";
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-paper ${toneClass}`}>{icon}</span>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-graphite">{label}</p>
        </div>
      </div>
    </Card>
  );
}
