import { AppShell, Badge, Card, PageHeader } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { isolationLabel } from "@/lib/isolation";
import { canManageCompany, roleLabel } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function CompanySettingsPage() {
  const user = await requireUser();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Workspace control"
        title="Company settings"
        description="Review the company workspace, isolation tier, and current access level. Editing controls will be added as the hosted setup hardens."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">{user.company.name}</h2>
          <div className="mt-4 space-y-3 text-sm text-graphite">
            <p>Slug: {user.company.slug}</p>
            <p>Status: {user.company.status}</p>
            <p>Namespace: {user.company.hermesNamespace ?? "Not set"}</p>
            <p>Hermes home: {user.company.hermesHomePath ?? "Shared/default"}</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Access profile</h2>
              <p className="mt-2 text-sm leading-6 text-graphite">
                Your account controls what appears in the sidebar and which actions are allowed server-side.
              </p>
            </div>
            <Badge tone="success">{roleLabel(user.role)}</Badge>
          </div>
          <p className="mt-4 rounded-md bg-paper px-3 py-2 text-sm text-graphite">
            Isolation: {isolationLabel(user.company.isolationTier)}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
