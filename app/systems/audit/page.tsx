import { redirect } from "next/navigation";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { KnowledgeCard, StatusBadge, SystemSubnav } from "@/components/SystemKnowledge";
import { platformAudit, recommendations } from "@/lib/architecture-knowledge";
import { requireUser } from "@/lib/auth";
import { isKipekeeAdmin } from "@/lib/roles";

export default async function AuditPage() {
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }

  return (
    <AppShell companyName={user.company?.name ?? "Kipekee Studio"} companySlug={user.company?.slug ?? "kipekee-studio"} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <SystemSubnav />
      <PageHeader
        eyebrow="Platform audit"
        title="Evidence-based readiness matrix"
        description="Current status of major platform areas based on inspected code, schema, routes, worker logic, and tests."
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase tracking-[0.12em] text-graphite">
              <tr>
                <th className="py-3 pr-4">Area</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Completion</th>
                <th className="py-3 pr-4">Notes</th>
                <th className="py-3 pr-4">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {platformAudit.map((item) => (
                <tr key={item.title}>
                  <td className="py-3 pr-4 font-semibold">{item.title}</td>
                  <td className="py-3 pr-4"><StatusBadge status={item.status} /></td>
                  <td className="py-3 pr-4">{item.completion}%</td>
                  <td className="py-3 pr-4 text-graphite">{item.summary}</td>
                  <td className="py-3 pr-4 text-xs text-graphite">{item.evidence.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {platformAudit.map((item) => (
          <KnowledgeCard item={item} key={item.title} />
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {recommendations.map((group) => (
          <Card key={group.priority}>
            <h2 className="text-xl font-semibold">{group.priority} priority</h2>
            <ul className="mt-4 space-y-3">
              {group.items.map((item) => (
                <li className="rounded-2xl bg-paper px-3 py-3 text-sm leading-6 text-graphite" key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
