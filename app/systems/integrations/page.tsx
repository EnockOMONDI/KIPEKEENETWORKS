import { redirect } from "next/navigation";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { KnowledgeCard, SystemSubnav } from "@/components/SystemKnowledge";
import { integrationStatus } from "@/lib/architecture-knowledge";
import { requireUser } from "@/lib/auth";
import { isKipekeeAdmin } from "@/lib/roles";

const connectorPattern = [
  "Owner: USER, WORKSPACE, or COMPANY.",
  "Connection: IntegrationConnection stores provider, status, scopes, and encrypted credential placeholder.",
  "Access: IntegrationAccess and MailboxAccess grant employee/work-instruction permissions.",
  "Execution: not implemented yet for real providers.",
  "Safety: no credentials are passed to Hermes; send actions remain approval-first in the MVP model."
];

export default async function IntegrationsArchitecturePage() {
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }

  return (
    <AppShell companyName={user.company?.name ?? "Kipekee Studio"} companySlug={user.company?.slug ?? "kipekee-studio"} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <SystemSubnav />
      <PageHeader
        eyebrow="Connector architecture"
        title="Integrations status"
        description="Every connector status is based on current code. Planned catalog entries are not treated as complete integrations."
      />

      <Card>
        <h2 className="text-xl font-semibold">Gateway pattern</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {connectorPattern.map((step) => (
            <p className="rounded-2xl bg-paper px-3 py-3 text-sm leading-6 text-graphite" key={step}>{step}</p>
          ))}
        </div>
      </Card>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {integrationStatus.map((item) => (
          <KnowledgeCard item={item} key={item.title} />
        ))}
      </section>
    </AppShell>
  );
}
