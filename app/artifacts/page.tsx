import { AppShell, Badge, Card, EmptyState, Notice, PageHeader } from "@/components/AppShell";
import { ArtifactUploadForm } from "@/components/ArtifactUploadForm";
import { uploadArtifactAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadPolicyMessage } from "@/lib/upload-policy";

export default async function ArtifactsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; uploaded?: string }>;
}) {
  const user = await requireCompanyContext();
  const params = await searchParams;
  const notice = uploadPolicyMessage(params.uploaded ? "uploaded" : params.error);
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
      {notice ? <Notice description={notice.description} title={notice.title} tone={notice.tone} /> : null}
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card>
          <h2 className="text-lg font-semibold">Upload file</h2>
          <ArtifactUploadForm action={uploadArtifactAction} employees={employees} returnTo="/artifacts" />
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
