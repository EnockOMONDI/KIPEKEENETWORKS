import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createMailboxAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCompany } from "@/lib/roles";
import { Mail, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

export default async function MailboxesPage() {
  const user = await requireCompanyContext();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }

  const [employees, mailboxes] = await Promise.all([
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true }
    }),
    prisma.mailbox.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        displayName: true,
        emailAddress: true,
        provider: true,
        status: true,
        access: {
          select: {
            canDraft: true,
            canRead: true,
            canRequestSend: true,
            canSendWithoutApproval: true,
            employee: { select: { displayName: true } }
          }
        }
      }
    })
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Mailboxes"
        title="Inbox permissions"
        description="Map organisation email accounts to AI employees. In this phase employees can read and draft only where access is granted; sending remains approval-first."
      />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f5f0ff] text-forest">
              <Mail size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Add mailbox access</h2>
              <p className="text-sm text-graphite">Credential connection comes later.</p>
            </div>
          </div>
          <form action={createMailboxAction} className="mt-5 space-y-3">
            <input className="min-h-11 w-full rounded-2xl border border-violetline px-3 py-2" name="address" placeholder="info@organisation.com" required type="email" />
            <input className="min-h-11 w-full rounded-2xl border border-violetline px-3 py-2" name="displayName" placeholder="Customer support inbox" />
            <select className="min-h-11 w-full rounded-2xl border border-violetline px-3 py-2" name="employeeId" required>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.displayName}
                </option>
              ))}
            </select>
            <select className="min-h-11 w-full rounded-2xl border border-violetline px-3 py-2" name="accessLevel" defaultValue="DRAFT">
              <option value="READ">Read only</option>
              <option value="DRAFT">Read and draft</option>
              <option value="SEND_WITH_APPROVAL">Draft, then send with approval</option>
            </select>
            <SubmitButton className="w-full" pendingText="Saving mailbox">
              Save mailbox access
            </SubmitButton>
          </form>
        </Card>

        <div className="space-y-3">
          {mailboxes.length ? (
            mailboxes.map((mailbox) => (
              <Card key={mailbox.id}>
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <h2 className="font-semibold">{mailbox.displayName}</h2>
                    <p className="mt-1 text-sm text-graphite">{mailbox.emailAddress} · {mailbox.provider}</p>
                  </div>
                  <Badge tone={mailbox.status === "CONNECTED" ? "success" : "warning"}>{mailbox.status}</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  {mailbox.access.map((access) => (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper px-3 py-2 text-sm" key={`${mailbox.id}-${access.employee.displayName}`}>
                      <span>{access.employee.displayName}</span>
                      <span className="font-semibold text-forest">{mailboxAccessLabel(access)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            <EmptyState title="No mailboxes yet" description="Add planned inboxes like info@, invoices@, orders@, or support@, then assign employee permissions." />
          )}
        </div>
      </div>

      <div className="mt-5">
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-green-50 text-success">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="font-semibold">MVP safety rule</h2>
              <p className="mt-2 text-sm leading-6 text-graphite">
                No mailbox credentials are exposed to Hermes. AI employees may draft email content through approved permissions, but external sending requires human approval in this phase.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function mailboxAccessLabel(access: { canRead: boolean; canDraft: boolean; canRequestSend: boolean; canSendWithoutApproval: boolean }) {
  if (access.canSendWithoutApproval) return "send allowed";
  if (access.canRequestSend) return "send with approval";
  if (access.canDraft) return "draft";
  if (access.canRead) return "read";
  return "no access";
}
