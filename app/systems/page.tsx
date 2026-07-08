import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SystemSubnav, systemKnowledgeLinks } from "@/components/SystemKnowledge";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isKipekeeAdmin } from "@/lib/roles";
import { envPresence } from "@/lib/server-log";
import { standardUploadLimitBytes, upgradeUploadLimitBytes } from "@/lib/upload-policy";

const onlineWindowMs = 45_000;
const staleJobMinutes = 10;

export default async function SystemsPage() {
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }

  const now = new Date();
  const staleJobCutoff = new Date(now.getTime() - staleJobMinutes * 60 * 1000);
  const workers = await prisma.workerHeartbeat.findMany({
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      currentJobId: true,
      lastSeenAt: true,
      runtime: true,
      workerId: true
    },
    take: 12
  });
  const recentJobs = await prisma.hermesJob.findMany({
    select: {
      id: true,
      createdAt: true,
      prompt: true,
      sessionId: true,
      status: true,
      company: { select: { name: true } },
      employee: { select: { displayName: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });
  const jobCounts = await prisma.hermesJob.groupBy({
    by: ["status"],
    _count: { status: true }
  });
  const companies = await prisma.company.count();
  const artifacts = await prisma.artifact.count();
  const memoryArtifacts = await prisma.artifact.count({ where: { memoryStatus: "MEMORY_INDEXED" } });
  const storageTotals = await prisma.artifact.aggregate({
    _sum: { fileSizeBytes: true }
  });
  const memoryStorageTotals = await prisma.artifact.aggregate({
    where: { memoryStatus: "MEMORY_INDEXED" },
    _sum: { fileSizeBytes: true }
  });
  const untrackedStorageFiles = await prisma.artifact.count({ where: { fileSizeBytes: 0 } });
  const companyStorageRows = await prisma.artifact.groupBy({
    by: ["companyId"],
    _count: { id: true },
    _sum: { fileSizeBytes: true },
    orderBy: { _sum: { fileSizeBytes: "desc" } }
  });
  const companyMemoryStorageRows = await prisma.artifact.groupBy({
    by: ["companyId"],
    where: { memoryStatus: "MEMORY_INDEXED" },
    _count: { id: true },
    _sum: { fileSizeBytes: true }
  });
  const companyUntrackedRows = await prisma.artifact.groupBy({
    by: ["companyId"],
    where: { fileSizeBytes: 0 },
    _count: { id: true }
  });
  const storageCompanies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" }
  });
  const pendingApprovals = await prisma.approvalRequest.count({ where: { status: "PENDING" } });
  const pendingInvites = await prisma.teamInvite.count({
    where: {
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: now }
    }
  });
  const runtimeGaps = await prisma.company.count({ where: { runtime: null } });
  const runtimePending = await prisma.companyRuntime.count({ where: { status: { notIn: ["ACTIVE", "READY"] } } });
  const staleJobs = await prisma.hermesJob.count({
    where: {
      status: "RUNNING",
      updatedAt: { lt: staleJobCutoff }
    }
  });
  const failedJobsToday = await prisma.hermesJob.count({
    where: {
      status: "FAILED",
      updatedAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    }
  });
  const connectorCallsToday = await prisma.auditLog.count({
    where: {
      action: { startsWith: "connector." },
      createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    }
  });
  const firecrawlCallsToday = await prisma.auditLog.count({
    where: {
      action: { startsWith: "connector.firecrawl" },
      createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    }
  });
  const prismfyCallsToday = await prisma.auditLog.count({
    where: {
      action: { startsWith: "connector.prismfy" },
      createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    }
  });
  const runtimePackageReady = await prisma.companyRuntime.count({ where: { status: { in: ["ACTIVE", "READY"] } } });
  const connectorEnv = envPresence(["FIRECRAWL_API_KEY", "PRISMFY_API_KEY"]);

  const counts = new Map(jobCounts.map((item) => [item.status, item._count.status]));
  const onlineWorkers = workers.filter((worker) => now.getTime() - worker.lastSeenAt.getTime() < onlineWindowMs);
  const trackedStorageBytes = storageTotals._sum.fileSizeBytes ?? 0;
  const memoryStorageBytes = memoryStorageTotals._sum.fileSizeBytes ?? 0;
  const companyNames = new Map(storageCompanies.map((company) => [company.id, company]));
  const companyMemoryStorage = new Map(
    companyMemoryStorageRows.map((row) => [
      row.companyId,
      {
        files: row._count.id,
        bytes: row._sum.fileSizeBytes ?? 0
      }
    ])
  );
  const companyUntrackedStorage = new Map(companyUntrackedRows.map((row) => [row.companyId, row._count.id]));

  const warnings = [
    runtimeGaps ? `${runtimeGaps} compan${runtimeGaps === 1 ? "y is" : "ies are"} missing a runtime.` : null,
    runtimePending ? `${runtimePending} organisation runtime${runtimePending === 1 ? " is" : "s are"} not active yet.` : null,
    staleJobs ? `${staleJobs} Hermes job${staleJobs === 1 ? " is" : "s are"} stuck in RUNNING.` : null,
    failedJobsToday ? `${failedJobsToday} job${failedJobsToday === 1 ? " has" : "s have"} failed in the last 24 hours.` : null,
    untrackedStorageFiles ? `${untrackedStorageFiles} older file${untrackedStorageFiles === 1 ? " has" : "s have"} no recorded storage size yet.` : null,
    onlineWorkers.length ? null : "No local Hermes worker heartbeat is currently online."
  ].filter((warning): warning is string => Boolean(warning));

  return (
    <AppShell companyName={user.company?.name ?? "Kipekee Studio"} companySlug={user.company?.slug ?? "kipekee-studio"} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <SystemSubnav />
      <PageHeader
        eyebrow="Operations"
        title="Systems"
        description="Kipekee Studio control room for web app health, local Hermes workers, client requests, and operational risk."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        {systemKnowledgeLinks.map((link) => (
          <Link className="rounded-3xl border border-violetline bg-white p-4 shadow-panel transition hover:-translate-y-0.5 hover:border-forest/40" href={link.href} key={link.href}>
            <p className="text-sm font-semibold text-forest">{link.label}</p>
            <p className="mt-2 text-xs leading-5 text-graphite">Open verified platform memory</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Web app" tone="success" value="Online" />
        <Metric label="Database" tone="success" value="Connected" />
        <Metric label="Hermes workers" tone={onlineWorkers.length ? "success" : "danger"} value={`${onlineWorkers.length}/${workers.length}`} />
        <Metric label="Pending jobs" tone={(counts.get("PENDING") ?? 0) ? "warning" : "neutral"} value={counts.get("PENDING") ?? 0} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric label="Organisations" value={companies} />
        <Metric label="Documents" value={artifacts} />
        <Metric label="Memory files" value={memoryArtifacts} />
        <Metric label="Tracked storage" value={formatBytes(trackedStorageBytes)} />
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric label="Runtime packages" tone={runtimePackageReady ? "success" : "warning"} value={runtimePackageReady} />
        <Metric label="Firecrawl connector" tone={connectorEnv.FIRECRAWL_API_KEY ? "success" : "warning"} value={connectorEnv.FIRECRAWL_API_KEY ? "Configured" : "Missing key"} />
        <Metric label="Prismfy search" tone={connectorEnv.PRISMFY_API_KEY ? "success" : "warning"} value={connectorEnv.PRISMFY_API_KEY ? "Configured" : "Missing key"} />
        <Metric label="Connector calls today" tone={connectorCallsToday ? "success" : "neutral"} value={connectorCallsToday} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Recent client requests</h2>
            <Badge tone={(counts.get("RUNNING") ?? 0) ? "warning" : "neutral"}>
              {counts.get("RUNNING") ?? 0} running
            </Badge>
          </div>
          {recentJobs.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-black/10 text-xs uppercase tracking-[0.12em] text-graphite">
                  <tr>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Organisation</th>
                    <th className="py-3 pr-4">Employee</th>
                    <th className="py-3 pr-4">Request</th>
                    <th className="py-3 pr-4">Created</th>
                    <th className="py-3 pr-4">Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {recentJobs.map((job) => (
                    <tr key={job.id}>
                      <td className="py-3 pr-4">
                        <Badge tone={statusTone(job.status)}>{job.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-semibold">{job.company.name}</td>
                      <td className="py-3 pr-4">{job.employee.displayName}</td>
                      <td className="max-w-xs truncate py-3 pr-4 text-graphite">{job.prompt}</td>
                      <td className="py-3 pr-4 text-graphite">{formatTime(job.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <Link className="font-semibold text-forest" href={`/chat?session=${job.sessionId}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No requests yet" description="Client chat and loop requests will appear here after users start working with AI employees." />
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Storage by organisation</h2>
            <Badge>{companyStorageRows.length} organisations</Badge>
          </div>
          {companyStorageRows.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-black/10 text-xs uppercase tracking-[0.12em] text-graphite">
                  <tr>
                    <th className="py-3 pr-4">Organisation</th>
                    <th className="py-3 pr-4">Files</th>
                    <th className="py-3 pr-4">Tracked storage</th>
                    <th className="py-3 pr-4">Memory files</th>
                    <th className="py-3 pr-4">Memory storage</th>
                    <th className="py-3 pr-4">Untracked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {companyStorageRows.map((row) => {
                    const companyKey = row.companyId ?? "workspace";
                    const company = row.companyId ? companyNames.get(row.companyId) : null;
                    const memory = companyMemoryStorage.get(row.companyId) ?? { files: 0, bytes: 0 };
                    const untracked = companyUntrackedStorage.get(row.companyId) ?? 0;

                    return (
                      <tr key={companyKey}>
                        <td className="py-3 pr-4">
                          <p className="font-semibold">{company?.name ?? "Workspace shared"}</p>
                          <p className="mt-1 text-xs text-graphite">{company?.slug ?? "shared-knowledge"}</p>
                        </td>
                        <td className="py-3 pr-4">{row._count.id}</td>
                        <td className="py-3 pr-4">{formatBytes(row._sum.fileSizeBytes ?? 0)}</td>
                        <td className="py-3 pr-4">{memory.files}</td>
                        <td className="py-3 pr-4">{formatBytes(memory.bytes)}</td>
                        <td className="py-3 pr-4">{untracked}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No storage yet" description="Uploaded organisation documents will appear here with per-organisation storage totals." />
          )}
        </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="text-xl font-semibold">Workers</h2>
            <div className="mt-4 space-y-3">
              {workers.length ? (
                workers.map((worker) => {
                  const online = now.getTime() - worker.lastSeenAt.getTime() < onlineWindowMs;
                  return (
                    <div className="rounded-md border border-black/10 bg-paper p-3" key={worker.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{worker.workerId}</p>
                        <Badge tone={online ? "success" : "danger"}>{online ? "ONLINE" : "OFFLINE"}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-graphite">Runtime: {worker.runtime}</p>
                      <p className="mt-1 text-sm text-graphite">Last seen: {formatTime(worker.lastSeenAt)}</p>
                      <p className="mt-1 text-sm text-graphite">
                        Current job: {worker.currentJobId ? worker.currentJobId.slice(0, 10) : "Idle"}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm leading-6 text-graphite">No worker heartbeat has been recorded yet. Restart the local Hermes worker after deploying this update.</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Storage</h2>
            <div className="mt-4 space-y-3 text-sm text-graphite">
              <p>Total tracked: {formatBytes(trackedStorageBytes)}</p>
              <p>Memory indexed: {formatBytes(memoryStorageBytes)}</p>
              <p>Untracked older files: {untrackedStorageFiles}</p>
              <p>Standard document limit: {formatBytes(standardUploadLimitBytes)}</p>
              <p>Storage boost limit: {formatBytes(upgradeUploadLimitBytes)}</p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Risk panel</h2>
            {warnings.length ? (
              <div className="mt-4 space-y-2">
                {warnings.map((warning) => (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900" key={warning}>
                    {warning}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-forest/10 px-3 py-2 text-sm font-semibold text-forest">
                No operational warnings right now.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-semibold">Client intake</h2>
            <div className="mt-4 space-y-3 text-sm text-graphite">
              <p>Open invites: {pendingInvites}</p>
              <p>Pending approvals: {pendingApprovals}</p>
              <p>Runtime gaps: {runtimeGaps}</p>
              <p>Runtimes not active: {runtimePending}</p>
              <p>Failed jobs today: {failedJobsToday}</p>
              <p>Firecrawl calls today: {firecrawlCallsToday}</p>
              <p>Prismfy calls today: {prismfyCallsToday}</p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  tone = "neutral",
  value
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger";
  value: string | number;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold">{value}</p>
          <p className="mt-2 text-sm text-graphite">{label}</p>
        </div>
        <Badge tone={tone}>{tone === "neutral" ? "OK" : tone.toUpperCase()}</Badge>
      </div>
    </Card>
  );
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "RUNNING" || status === "PENDING") return "warning";
  return "neutral";
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi"
  }).format(date);
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}
