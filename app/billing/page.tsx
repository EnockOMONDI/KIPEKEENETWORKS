import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createInvoiceAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageBilling, isKipekeeAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function BillingPage() {
  const user = await requireUser();
  if (!canManageBilling(user)) {
    redirect("/dashboard");
  }
  const platformAdmin = isKipekeeAdmin(user);
  const [subscription, invoices, companies] = await Promise.all([
    prisma.subscription.findUnique({
      where: { companyId: user.companyId },
      include: { onboardingPackage: true }
    }),
    prisma.invoice.findMany({
      where: platformAdmin ? undefined : { companyId: user.companyId },
      include: { company: true },
      orderBy: { createdAt: "desc" }
    }),
    platformAdmin
      ? prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([])
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Revenue"
        title="Billing and invoice records"
        description="Kipekee Networks keeps setup fees and monthly user subscriptions as separate revenue layers."
      />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5">
          <Card>
            <h2 className="text-lg font-semibold">Current subscription</h2>
            <p className="mt-3 text-sm text-graphite">
              Package: {subscription?.onboardingPackage?.name ?? "None"}
            </p>
            <p className="mt-2 text-sm text-graphite">
              Monthly: KES {subscription?.monthlyUserPriceKes.toLocaleString()} / user
            </p>
            <p className="mt-2 text-sm text-graphite">Paid users: {subscription?.paidUsers}</p>
          </Card>
          {platformAdmin ? (
          <Card>
            <h2 className="text-lg font-semibold">Create invoice</h2>
            <form action={createInvoiceAction} className="mt-4 space-y-3">
              <select className="w-full rounded-md border border-black/10 px-3 py-2" name="companyId" defaultValue={user.companyId}>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <input className="w-full rounded-md border border-black/10 px-3 py-2" name="invoiceNo" placeholder="KN-0002" required />
              <input className="w-full rounded-md border border-black/10 px-3 py-2" name="description" placeholder="Monthly subscription" required />
              <input className="w-full rounded-md border border-black/10 px-3 py-2" min="1" name="amountKes" placeholder="4500" required type="number" />
              <SubmitButton className="w-full" pendingText="Creating invoice">
                Create invoice
              </SubmitButton>
            </form>
          </Card>
          ) : null}
        </div>
        <div className="space-y-3">
          {invoices.length ? (
            invoices.map((invoice) => (
              <Card key={invoice.id}>
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{invoice.invoiceNo}</h2>
                    <p className="mt-2 text-sm text-graphite">{invoice.description}</p>
                    {platformAdmin ? <p className="mt-1 text-xs text-graphite">{invoice.company.name}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">KES {invoice.amountKes.toLocaleString()}</p>
                    <div className="mt-2">
                      <Badge>{invoice.status}</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No invoices yet"
              description="Create setup, subscription, customization, or integration invoices as client workspaces go live."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
