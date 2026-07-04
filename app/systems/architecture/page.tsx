import { redirect } from "next/navigation";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { DetailList, SystemSubnav } from "@/components/SystemKnowledge";
import { architectureSummary, requestLifecycle, runtimeComponents, systemArchitecture } from "@/lib/architecture-knowledge";
import { requireUser } from "@/lib/auth";
import { isKipekeeAdmin } from "@/lib/roles";

export default async function ArchitecturePage() {
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }

  return (
    <AppShell companyName={user.company?.name ?? "Kipekee Studio"} companySlug={user.company?.slug ?? "kipekee-studio"} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <SystemSubnav />
      <PageHeader
        eyebrow="Architecture memory"
        title="Hermes and Kipekee architecture"
        description={architectureSummary.sourceOfTruth}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-graphite">Current maturity</p>
          <p className="mt-3 text-2xl font-semibold">{architectureSummary.maturity}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-graphite">Code-observed completion</p>
          <p className="mt-3 text-3xl font-semibold">{architectureSummary.completion}%</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-graphite">Operating philosophy</p>
          <p className="mt-3 text-sm leading-6 text-graphite">{architectureSummary.philosophy}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="text-xl font-semibold">System architecture map</h2>
          <div className="mt-5 space-y-3">
            {systemArchitecture.map((node, index) => (
              <div className="rounded-3xl border border-violetline bg-paper p-4" key={node.name}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Step {index + 1}</p>
                <h3 className="mt-1 font-semibold">{node.name}</h3>
                <p className="mt-2 text-sm leading-6 text-graphite">{node.summary}</p>
                <DetailList title="Source files" values={node.files} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Architecture style</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-graphite">
            <p>Customer-facing app: Kipekee Networks.</p>
            <p>Hidden orchestration layer: Hermes runtime/profile execution.</p>
            <p>Tenant hierarchy: User, Workspace, Organisation, CompanyRuntime.</p>
            <p>Execution style: signed database queue processed by local or VPS worker.</p>
            <p>Client language: AI employees, skills, work instructions, knowledge, approvals.</p>
          </div>
        </Card>
      </div>

      <section className="mt-6">
        <h2 className="mb-4 text-xl font-semibold">Request lifecycle</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {requestLifecycle.map((step, index) => (
            <Card key={step.name}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Node {index + 1}</p>
              <h3 className="mt-1 font-semibold">{step.name}</h3>
              <div className="mt-4 space-y-3 text-sm leading-6 text-graphite">
                <p><span className="font-semibold text-ink">Input:</span> {step.input}</p>
                <p><span className="font-semibold text-ink">Output:</span> {step.output}</p>
                <p><span className="font-semibold text-ink">Security:</span> {step.security}</p>
                <p><span className="font-semibold text-ink">Failure:</span> {step.failures}</p>
              </div>
              <DetailList title="Source files" values={step.files} />
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-4 text-xl font-semibold">AI runtime components</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {runtimeComponents.map((item) => (
            <RuntimeMiniCard item={item} key={item.title} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function RuntimeMiniCard({ item }: { item: (typeof runtimeComponents)[number] }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-graphite">{item.summary}</p>
        </div>
        <p className="rounded-2xl bg-paper px-3 py-1 text-sm font-semibold">{item.completion}%</p>
      </div>
      <DetailList title="Evidence" values={item.evidence} />
    </Card>
  );
}
