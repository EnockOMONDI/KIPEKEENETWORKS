import Link from "next/link";
import { Badge, Card } from "@/components/AppShell";
import type { ArchitectureStatus, KnowledgeItem } from "@/lib/architecture-knowledge";

export const systemKnowledgeLinks = [
  { href: "/systems/architecture", label: "Architecture" },
  { href: "/systems/data", label: "Data" },
  { href: "/systems/security", label: "Security" },
  { href: "/systems/integrations", label: "Integrations" },
  { href: "/systems/audit", label: "Audit" }
] as const;

export function SystemSubnav() {
  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
      <Link className="shrink-0 rounded-2xl border border-violetline bg-white px-4 py-2 text-sm font-semibold text-forest" href="/systems">
        Live Systems
      </Link>
      {systemKnowledgeLinks.map((link) => (
        <Link className="shrink-0 rounded-2xl border border-violetline bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-[#f5f0ff]" href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export function StatusBadge({ status }: { status: ArchitectureStatus }) {
  const tone = status === "Complete" ? "success" : status === "Risk" ? "danger" : status === "Pending" ? "danger" : "warning";
  return <Badge tone={tone}>{status}</Badge>;
}

export function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  return (
    <Card>
      <div className="flex flex-col justify-between gap-3 md:flex-row">
        <div>
          <h2 className="text-lg font-semibold">{item.title}</h2>
          <p className="mt-2 text-sm leading-6 text-graphite">{item.summary}</p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <StatusBadge status={item.status} />
          <p className="mt-2 text-sm font-semibold text-ink">{item.completion}%</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-forest" style={{ width: `${item.completion}%` }} />
      </div>
      <DetailColumns item={item} />
    </Card>
  );
}

function DetailColumns({ item }: { item: KnowledgeItem }) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      <DetailList title="Evidence" values={item.evidence} />
      <DetailList title="Risks" values={item.risks} />
      <DetailList title="Next" values={item.next} />
    </div>
  );
}

export function DetailList({ title, values }: { title: string; values: string[] }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-graphite">{title}</p>
      <ul className="mt-2 space-y-2">
        {values.map((value) => (
          <li className="rounded-2xl bg-paper px-3 py-2 text-xs leading-5 text-graphite" key={value}>
            {value}
          </li>
        ))}
      </ul>
    </section>
  );
}
