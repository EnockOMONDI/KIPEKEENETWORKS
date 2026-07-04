import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { uploadArtifactAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FileText, UploadCloud } from "lucide-react";

export default async function DocumentsPage() {
  const user = await requireCompanyContext();
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
          <form action={uploadArtifactAction} className="mt-5 space-y-4">
            <input className="min-h-11 w-full rounded-2xl border border-violetline px-3 py-2 text-sm" name="file" required type="file" />
            <label className="flex min-h-11 items-center gap-2 rounded-2xl bg-paper px-3 text-sm font-medium">
              <input name="addToMemory" type="checkbox" />
              Add this document to memory
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">Employee access</p>
              <div className="max-h-72 space-y-2 overflow-auto rounded-2xl border border-violetline bg-paper p-3">
                {employees.map((employee) => (
                  <label className="flex min-h-10 items-center gap-2 text-sm" key={employee.id}>
                    <input name="employeeIds" type="checkbox" value={employee.id} />
                    {employee.displayName}
                  </label>
                ))}
              </div>
            </div>
            <SubmitButton className="w-full" pendingText="Uploading">
              Upload document
            </SubmitButton>
          </form>
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
            <EmptyState title="No documents yet" description="Upload SOPs, proposals, price lists, brand files, policies, and templates for this organisation." />
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
