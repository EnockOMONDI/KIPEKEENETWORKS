import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createApprovalAction, decideApprovalAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCompany } from "@/lib/roles";

export default async function ApprovalsPage() {
  const user = await requireCompanyContext();
  const manager = canManageCompany(user);
  const approvals = await prisma.approvalRequest.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Human control"
        title="Approval inbox"
        description="AI employees prepare work. Humans approve sensitive or external actions before anything leaves Kipekee Networks."
      />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Request approval</h2>
          <form action={createApprovalAction} className="mt-4 space-y-3">
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="title" placeholder="Send proposal to client" required />
            <textarea className="min-h-28 w-full rounded-md border border-black/10 px-3 py-2" name="details" placeholder="What needs approval?" required />
            <SubmitButton className="w-full" pendingText="Creating request">
              Create request
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
                    <p className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 text-sm leading-6 text-graphite">
                      {approval.details}
                    </p>
                    <p className="mt-2 text-xs text-graphite">Requested by {approval.requestedBy}</p>
                  </div>
                  <Badge tone={approval.status === "PENDING" ? "warning" : approval.status === "APPROVED" ? "success" : "danger"}>
                    {approval.status}
                  </Badge>
                </div>
                {approval.status === "PENDING" && manager ? (
                  <div className="mt-4 flex gap-2">
                    <form action={decideApprovalAction}>
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="status" type="hidden" value="APPROVED" />
                      <SubmitButton pendingText="Approving">
                      Approve
                      </SubmitButton>
                    </form>
                    <form action={decideApprovalAction}>
                      <input name="approvalId" type="hidden" value={approval.id} />
                      <input name="status" type="hidden" value="REJECTED" />
                      <SubmitButton pendingText="Rejecting" variant="secondary">
                      Reject
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}
              </Card>
            ))
          ) : (
            <EmptyState
              title="Approval inbox is clear"
              description="When AI employees prepare sensitive work, loop outputs, or external actions, they will land here for human review."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
