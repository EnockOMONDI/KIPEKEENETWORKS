import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { createCompanyAction } from "@/lib/actions";
import { inviteUrl as buildInviteUrl } from "@/lib/app-url";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isolationLabel, isolationTiers } from "@/lib/isolation";
import { requestOrigin } from "@/lib/request-security";
import { isKipekeeAdmin } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const origin = await requestOrigin();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }
  const [packages, companies] = await Promise.all([
    prisma.onboardingPackage.findMany({ orderBy: { priceKes: "asc" } }),
    prisma.company.findMany({ orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  const inviteUrl = params.invite ? buildInviteUrl(params.invite, origin) : null;

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Growth"
        title="Client onboarding"
        description="Create company workspaces, choose a package, then configure AI employees, documents, memory, and loops."
      />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">New company</h2>
          {inviteUrl ? (
            <div className="mt-4 rounded-md border border-forest/20 bg-forest/5 p-3 text-sm">
              <p className="font-semibold text-forest">Client owner invite created</p>
              <p className="mt-2 break-all text-graphite">{inviteUrl}</p>
            </div>
          ) : null}
          <form action={createCompanyAction} className="mt-4 space-y-3">
            <input className="w-full rounded-md border border-black/10 px-3 py-2" name="companyName" placeholder="Acme Travel Ltd" required />
            <select className="w-full rounded-md border border-black/10 px-3 py-2" name="packageId" required>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} {pkg.priceKes ? `- KES ${pkg.priceKes}` : "- quoted"}
                </option>
              ))}
            </select>
            <select className="w-full rounded-md border border-black/10 px-3 py-2" name="isolationTier" defaultValue="SHARED">
              {isolationTiers.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </select>
            <div className="rounded-md border border-black/10 bg-paper p-3">
              <p className="mb-3 text-sm font-semibold">Client owner login</p>
              <input className="mb-2 w-full rounded-md border border-black/10 px-3 py-2" name="ownerName" placeholder="Owner full name" />
              <input className="mb-2 w-full rounded-md border border-black/10 px-3 py-2" name="ownerEmail" placeholder="owner@client.com" type="email" />
              <p className="mt-2 text-xs leading-5 text-graphite">
                If filled, the app creates a one-time invite link for the first client owner.
              </p>
            </div>
            <SubmitButton className="w-full" pendingText="Creating workspace">
              Create workspace
            </SubmitButton>
          </form>
          <div className="mt-4 space-y-2">
            {isolationTiers.map((tier) => (
              <p key={tier.value} className="rounded-md bg-paper px-3 py-2 text-xs leading-5 text-graphite">
                <span className="font-semibold text-ink">{tier.label}:</span> {tier.description}
              </p>
            ))}
          </div>
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          {companies.length ? (
            companies.map((company) => (
              <Card key={company.id}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{company.name}</h2>
                  <Badge tone={company.status === "ACTIVE" ? "success" : "warning"}>{company.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-graphite">{company.slug}</p>
                <p className="mt-3 rounded-md bg-paper px-3 py-2 text-xs">
                  {isolationLabel(company.isolationTier)}
                </p>
                <p className="mt-2 text-xs text-graphite">
                  Namespace: {company.hermesNamespace ?? "not set"}
                </p>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No client workspaces yet"
              description="Create the first external company after Kipekee Studio has validated the workflow internally."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
