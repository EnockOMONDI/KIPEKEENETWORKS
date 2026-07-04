import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { uploadArtifactAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ArtifactsPage() {
  const user = await requireCompanyContext();
  const [employees, artifacts] = await Promise.all([
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" }
    }),
    prisma.artifact.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        title: true,
        kind: true,
        fileSizeBytes: true,
        memoryStatus: true,
        access: { select: { id: true, employee: { select: { displayName: true } } } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Artifacts"
        title="Files and document memory"
        description="Every upload is stored as an artifact first. The user decides whether it becomes memory and which AI employees can access it."
      />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Upload file</h2>
          <form action={uploadArtifactAction} className="mt-4 space-y-4">
            <input className="w-full rounded-md border border-black/10 px-3 py-2 text-sm" name="file" required type="file" />
            <label className="flex items-center gap-2 text-sm font-medium">
              <input name="addToMemory" type="checkbox" />
              Add this artifact to memory
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">Which AI employees can access it?</p>
              <div className="max-h-72 space-y-2 overflow-auto rounded-md border border-black/10 bg-paper p-3">
                {employees.map((employee) => (
                  <label className="flex items-center gap-2 text-sm" key={employee.id}>
                    <input name="employeeIds" type="checkbox" value={employee.id} />
                    {employee.displayName}
                  </label>
                ))}
              </div>
            </div>
            <SubmitButton className="w-full" pendingText="Uploading and indexing">
              Upload artifact
            </SubmitButton>
          </form>
        </Card>
        <div className="space-y-3">
          {artifacts.length ? (
            artifacts.map((artifact) => (
              <Card key={artifact.id}>
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <h2 className="font-semibold">{artifact.title}</h2>
                    <p className="mt-1 text-sm text-graphite">
                      {artifact.kind} · {artifact.fileSizeBytes ? formatBytes(artifact.fileSizeBytes) : "Size not tracked"}
                    </p>
                  </div>
                  <Badge tone={artifact.memoryStatus === "MEMORY_INDEXED" ? "success" : "neutral"}>
                    {artifact.memoryStatus === "MEMORY_INDEXED" ? "Memory indexed" : "Artifact only"}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-graphite">
                  Access:{" "}
                  {artifact.access.length
                    ? artifact.access.map((item) => item.employee.displayName).join(", ")
                    : "No employees selected"}
                </p>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No artifacts yet"
              description="Upload organisation documents, proposals, policies, templates, or work instructions, then decide which AI employees can use them as memory."
            />
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
