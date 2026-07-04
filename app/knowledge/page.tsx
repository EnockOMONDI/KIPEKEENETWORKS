import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookOpen, Database, FileText, ShieldCheck } from "lucide-react";

export default async function KnowledgePage() {
  const user = await requireCompanyContext();
  const [collections, recentArtifacts, memoryFiles] = await Promise.all([
    prisma.knowledgeCollection.findMany({
      where: { OR: [{ companyId: user.companyId }, { workspaceId: user.workspaceId, companyId: null }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        category: true,
        name: true,
        ownerType: true,
        sensitivity: true,
        artifacts: { select: { id: true } },
        chunks: { select: { id: true } }
      }
    }),
    prisma.artifact.findMany({
      where: { OR: [{ companyId: user.companyId }, { workspaceId: user.workspaceId, companyId: null }] },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, memoryStatus: true, title: true },
      take: 6
    }),
    prisma.artifact.count({
      where: {
        memoryStatus: "MEMORY_INDEXED",
        OR: [{ companyId: user.companyId }, { workspaceId: user.workspaceId, companyId: null }]
      }
    })
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Knowledge"
        title="Organisation memory"
        description="Knowledge collections keep business context organised by topic, sensitivity, and access scope before AI employees use it."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<BookOpen size={18} />} label="Collections" value={collections.length} />
        <Metric icon={<FileText size={18} />} label="Recent files" value={recentArtifacts.length} />
        <Metric icon={<Database size={18} />} label="Memory indexed" value={memoryFiles} />
        <Metric icon={<ShieldCheck size={18} />} label="Scope" value="Private" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 md:grid-cols-2">
          {collections.length ? (
            collections.map((collection) => (
              <Card key={collection.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{collection.name}</h2>
                    <p className="mt-2 text-sm text-graphite">{collection.category} · {collection.ownerType.toLowerCase()} scoped</p>
                  </div>
                  <Badge tone={collection.sensitivity === "HIGH" ? "warning" : "neutral"}>{collection.sensitivity}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-paper p-3">
                    <p className="text-2xl font-semibold">{collection.artifacts.length}</p>
                    <p className="mt-1 text-graphite">Files</p>
                  </div>
                  <div className="rounded-2xl bg-paper p-3">
                    <p className="text-2xl font-semibold">{collection.chunks.length}</p>
                    <p className="mt-1 text-graphite">Indexed chunks</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState title="No knowledge collections yet" description="Onboarding and document uploads will create organisation collections such as policies, proposals, suppliers, customers, and brand voice." />
          )}
        </div>

        <Card>
          <h2 className="text-lg font-semibold">Recent knowledge files</h2>
          <div className="mt-4 space-y-3">
            {recentArtifacts.length ? (
              recentArtifacts.map((artifact) => (
                <div className="rounded-2xl border border-violetline bg-paper p-3" key={artifact.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{artifact.title}</p>
                      <p className="mt-1 text-xs text-graphite">{artifact.kind}</p>
                    </div>
                    <Badge tone={artifact.memoryStatus === "MEMORY_INDEXED" ? "success" : "neutral"}>
                      {artifact.memoryStatus === "MEMORY_INDEXED" ? "Memory" : "File"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-graphite">No documents have been uploaded yet.</p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#f5f0ff] text-forest">{icon}</span>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-graphite">{label}</p>
        </div>
      </div>
    </Card>
  );
}
