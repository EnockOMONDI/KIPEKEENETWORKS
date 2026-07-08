import { AppShell, Badge, Card, EmptyState, Notice, PageHeader } from "@/components/AppShell";
import { ArtifactUploadForm } from "@/components/ArtifactUploadForm";
import { uploadArtifactAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadPolicyMessage } from "@/lib/upload-policy";
import { FileText, UploadCloud } from "lucide-react";

export default async function DocumentsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; uploaded?: string }>;
}) {
  const user = await requireCompanyContext();
  const params = await searchParams;
  const notice = uploadPolicyMessage(params.uploaded ? "uploaded" : params.error);
  const [employees, documents] = await Promise.all([
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true }
    }),
    prisma.artifact.findMany({
      where: { OR: [{ companyId: user.companyId }, { workspaceId: user.workspaceId, companyId: null }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        fileSizeBytes: true,
        kind: true,
        memoryStatus: true,
        title: true,
        collection: { select: { name: true } },
        access: { select: { employee: { select: { displayName: true } } } }
      }
    })
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Documents"
        title="Files and memory access"
        description="Upload business files, decide whether they become memory, and choose which AI employees can use them."
      />
      {notice ? <Notice description={notice.description} title={notice.title} tone={notice.tone} /> : null}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f5f0ff] text-forest">
              <UploadCloud size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Upload document</h2>
              <p className="text-sm text-graphite">Private to this organisation by default.</p>
            </div>
          </div>
          <ArtifactUploadForm action={uploadArtifactAction} employees={employees} kind="document" returnTo="/documents" />
        </Card>

        <div className="space-y-3">
          {documents.length ? (
            documents.map((document) => (
              <Card key={document.id}>
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef2ff] text-forest">
                        <FileText size={19} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold">{document.title}</h2>
                        <p className="mt-1 text-sm text-graphite">
                          {document.kind} · {document.fileSizeBytes ? formatBytes(document.fileSizeBytes) : "Size not tracked"} · {document.collection?.name ?? "Unfiled"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Badge tone={document.memoryStatus === "MEMORY_INDEXED" ? "success" : "neutral"}>
                    {document.memoryStatus === "MEMORY_INDEXED" ? "Memory indexed" : "Artifact only"}
                  </Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-graphite">
                  Access: {document.access.length ? document.access.map((item) => item.employee.displayName).join(", ") : "No employees selected"}
                </p>
                <p className="mt-1 text-xs text-graphite">Uploaded {document.createdAt.toLocaleDateString()}</p>
              </Card>
            ))
          ) : (
            <EmptyState title="No documents yet" description="Upload proposals, price lists, brand files, policies, templates, and work instructions for this organisation." />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}
