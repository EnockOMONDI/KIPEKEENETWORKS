import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isKipekeeAdmin } from "@/lib/roles";

const onlineWindowMs = 45_000;
const staleJobMinutes = 10;

export default async function SystemsPage() {
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }

  const now = new Date();
  const staleJobCutoff = new Date(now.getTime() - staleJobMinutes * 60 * 1000);
  const [
    workers,
    recentJobs,
    jobCounts,
    companies,
    artifacts,
    memoryArtifacts,
    pendingApprovals,
    pendingInvites,
    setupGaps,
    profileGaps,
    staleJobs,
    failedJobsToday
  ] = await Promise.all([
    prisma.workerHeartbeat.findMany({ orderBy: { lastSeenAt: "desc" }, take: 12 }),
    prisma.hermesJob.findMany({
      include: {
        company: true,
        employee: true,
        session: true
      },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.hermesJob.groupBy({
      by: ["status"],
      _count: { status: true }
    }),
    prisma.company.count(),
    prisma.artifact.count(),
    prisma.artifact.count({ where: { memoryStatus: "MEMORY_INDEXED" } }),
    prisma.approvalRequest.count({ where: { status: "PENDING" } }),
    prisma.teamInvite.count({
      where: {
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now }
      }
    }),
    prisma.employeeProfileSetup.count({ where: { status: { not: "APPROVED" } } }),
    prisma.companyEmployee.count({
      where: {
        company: { isolationTier: "PROFILE" },
        hermesProfile: null
      }
    }),
    prisma.hermesJob.count({
      where: {
        status: "RUNNING",
        updatedAt: { lt: staleJobCutoff }
      }
    }),
    prisma.hermesJob.count({
      where: {
        status: "FAILED",
        updatedAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  const counts = new Map(jobCounts.map((item) => [item.status, item._count.status]));
  const onlineWorkers = workers.filter((worker) => now.getTime() - worker.lastSeenAt.getTime() < onlineWindowMs);

  const warnings = [
    setupGaps ? `${setupGaps} employee setup brief${setupGaps === 1 ? " needs" : "s need"} approval.` : null,
    profileGaps ? `${profileGaps} profile-isolated employee${profileGaps === 1 ? " is" : "s are"} missing a profile.` : null,
    staleJobs ? `${staleJobs} Hermes job${staleJobs === 1 ? " is" : "s are"} stuck in RUNNING.` : null,
    failedJobsToday ? `${failedJobsToday} job${failedJobsToday === 1 ? " has" : "s have"} failed in the last 24 hours.` : null,
    onlineWorkers.length ? null : "No local Hermes worker heartbeat is currently online."
  ].filter((warning): warning is string => Boolean(warning));

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Operations"
        title="Systems"
        description="Kipekee Studio control room for web app health, local Hermes workers, client requests, and operational risk."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Web app" tone="success" value="Online" />
        <Metric label="Database" tone="success" value="Connected" />
        <Metric label="Hermes workers" tone={onlineWorkers.length ? "success" : "danger"} value={`${onlineWorkers.length}/${workers.length}`} />
        <Metric label="Pending jobs" tone={(counts.get("PENDING") ?? 0) ? "warning" : "neutral"} value={counts.get("PENDING") ?? 0} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric label="Companies" value={companies} />
        <Metric label="Documents" value={artifacts} />
        <Metric label="Memory files" value={memoryArtifacts} />
        <Metric label="Pending approvals" tone={pendingApprovals ? "warning" : "neutral"} value={pendingApprovals} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
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
                    <th className="py-3 pr-4">Company</th>
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
              <p>Profile setup gaps: {setupGaps}</p>
              <p>Profile mapping gaps: {profileGaps}</p>
              <p>Failed jobs today: {failedJobsToday}</p>
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
