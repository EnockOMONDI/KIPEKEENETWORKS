import { redirect } from "next/navigation";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { KnowledgeCard, SystemSubnav } from "@/components/SystemKnowledge";
import { securityControls } from "@/lib/architecture-knowledge";
import { requireUser } from "@/lib/auth";
import { isKipekeeAdmin } from "@/lib/roles";

const zeroTrustFlow = [
  "Browser never receives service-role secrets or Hermes profile details.",
  "Server actions enforce same-origin checks before mutations.",
  "Current user resolves workspace and organisation on the server.",
  "Mutations apply RBAC and rate limits server-side.",
  "Chat jobs are signed before entering the database queue.",
  "Worker re-validates job signature and scope before Hermes execution.",
  "Memory context includes only employee-approved artifacts.",
  "Hermes prompt treats documents as untrusted reference material.",
  "Assistant output is sanitized for infrastructure leaks before persistence.",
  "Audit logs record major queued/completed/rejected events."
];

export default async function SecurityPage() {
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }

  return (
    <AppShell companyName={user.company?.name ?? "Kipekee Studio"} companySlug={user.company?.slug ?? "kipekee-studio"} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <SystemSubnav />
      <PageHeader
        eyebrow="Security architecture"
        title="Zero-trust controls"
        description="Security controls verified from auth, role checks, rate limits, job signing, storage, Hermes profile hardening, and worker validation code."
      />

      <Card>
        <h2 className="text-xl font-semibold">Request security flow</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {zeroTrustFlow.map((step, index) => (
            <div className="rounded-2xl border border-violetline bg-paper p-4" key={step}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Control {index + 1}</p>
              <p className="mt-2 text-sm leading-6 text-graphite">{step}</p>
            </div>
          ))}
        </div>
      </Card>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {securityControls.map((item) => (
          <KnowledgeCard item={item} key={item.title} />
        ))}
      </section>
    </AppShell>
  );
}
