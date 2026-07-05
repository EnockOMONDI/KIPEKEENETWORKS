import Link from "next/link";
import {
  AppShell,
  Badge,
  EmptyState,
  Notice
} from "@/components/AppShell";
import { ChatAutoRefresh } from "@/components/ChatAutoRefresh";
import { ChatComposer } from "@/components/ChatComposer";
import { chatAction } from "@/lib/actions";
import { requireCompanyContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pageNotice } from "@/lib/page-notices";
import {
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  Mail,
  PenLine,
  Search,
  Sparkles,
  Workflow
} from "lucide-react";

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; session?: string }>;
}) {
  const user = await requireCompanyContext();
  const params = await searchParams;
  const notice = pageNotice("chat", params.error);
  const [employees, workflows, sessions, artifacts] = await Promise.all([
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        displayName: true,
        active: true,
        template: { select: { description: true } },
        _count: { select: { skills: true, artifactAccess: true } }
      }
    }),
    prisma.workflow.findMany({
      where: { companyId: user.companyId, status: { in: ["ACTIVE", "DRAFT"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, status: true, steps: { select: { id: true }, orderBy: { stepOrder: "asc" } } }
    }),
    prisma.session.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        title: true,
        employeeId: true,
        workflowId: true,
        updatedAt: true,
        employee: { select: { displayName: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 24
    }),
    prisma.artifact.findMany({
      where: { OR: [{ companyId: user.companyId }, { workspaceId: user.workspaceId, companyId: null }] },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, kind: true, memoryStatus: true },
      take: 8
    })
  ]);

  const selectedSession = sessions.find((session) => session.id === params.session) ?? sessions[0] ?? null;
  const selectedEmployeeId = selectedSession?.employeeId ?? employees[0]?.id;
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0] ?? null;
  const selectedWorkflow = workflows.find((workflow) => workflow.id === selectedSession?.workflowId) ?? workflows[0] ?? null;
  const [projectMessages, selectedJobs, selectedEmployeeDetail] = await Promise.all([
    selectedSession
      ? prisma.message.findMany({
          where: { sessionId: selectedSession.id },
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true, createdAt: true }
        })
      : Promise.resolve([]),
    selectedSession
      ? prisma.hermesJob.findMany({
          where: { sessionId: selectedSession.id },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, status: true, employeeName: true, createdAt: true }
        })
      : Promise.resolve([]),
    selectedEmployee
      ? prisma.companyEmployee.findFirst({
          where: { id: selectedEmployee.id, companyId: user.companyId },
          select: {
            skills: { where: { enabled: true }, select: { skill: { select: { name: true } } } },
            artifactAccess: { where: { canUseAsMemory: true }, select: { artifactId: true } }
          }
        })
      : Promise.resolve(null)
  ]);
  const activeJobs = selectedJobs.filter((job) => ["PENDING", "RUNNING"].includes(job.status));

  return (
    <AppShell
      companyName={user.company.name}
      companySlug={user.company.slug}
      fullBleed
      platformRole={user.role}
      userEmail={user.email}
      userRole={user.memberRole || user.role}
    >
      {notice ? (
        <div className="px-3 pt-4 sm:px-5 xl:px-6">
          <Notice description={notice.description} title={notice.title} tone={notice.tone} />
        </div>
      ) : null}
      <ChatAutoRefresh active={activeJobs.length > 0} />
      <div className="grid min-h-[calc(100vh-74px)] gap-0 overflow-hidden rounded-[28px] border border-violetline bg-white shadow-panel xl:grid-cols-[320px_minmax(0,1fr)_340px] xl:rounded-none xl:border-x xl:border-y-0">
        <EmployeeRail
          employees={employees.map((employee) => ({
            id: employee.id,
            active: employee.id === selectedEmployeeId,
            description: organisationCopy(employee.template.description),
            displayName: employee.displayName,
            online: employee.active,
            skillCount: employee._count.skills
          }))}
          sessions={sessions.map((session) => ({
            href: `/chat?session=${session.id}`,
            title: session.title,
            active: session.id === selectedSession?.id,
            employeeName: session.employee.displayName,
            running: session.id === selectedSession?.id && activeJobs.length > 0
          }))}
        />

        <section className="flex min-h-[calc(100vh-74px)] min-w-0 flex-col border-x border-violetline bg-white">
          <WorkflowHeader
            organisationName={user.company.name}
            selectedWorkflow={selectedWorkflow ? { id: selectedWorkflow.id, name: selectedWorkflow.name, stepCount: selectedWorkflow.steps.length } : null}
            title={selectedSession?.title ?? "New conversation"}
          />

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8">
            {projectMessages.length ? (
              projectMessages.map((message) =>
                message.role === "user" ? (
                  <UserBubble content={message.content} key={message.id} />
                ) : (
                  <AssistantWorkspace
                    artifacts={artifacts}
                    content={message.content}
                    employeeName={selectedEmployee?.displayName ?? "AI employee"}
                    key={message.id}
                  />
                )
              )
            ) : (
              <EmptyState
                title="Start with a clear business outcome"
                description="Ask an AI employee to draft, analyze, plan, summarize, or prepare next actions. The workspace will keep context, files, and approvals together."
              />
            )}
            {activeJobs.map((job) => (
              <WorkingCard employeeName={job.employeeName} key={job.id} status={job.status} />
            ))}
          </div>

          {employees.length ? (
            <form action={chatAction} className="sticky bottom-0 z-20 border-t border-violetline bg-white/95 px-4 py-4 backdrop-blur sm:px-8">
              <ChatComposer
                employees={employees.map((employee) => ({ id: employee.id, displayName: employee.displayName }))}
                selectedEmployeeId={selectedEmployeeId}
                sessionId={selectedSession?.id}
                workflows={workflows.map((workflow) => ({ id: workflow.id, name: workflow.name }))}
              />
            </form>
          ) : null}
        </section>

        <ContextPanel
          activeJobs={activeJobs.length}
          artifacts={artifacts}
          employee={selectedEmployee ? {
            displayName: selectedEmployee.displayName,
            description: organisationCopy(selectedEmployee.template.description),
            skills: selectedEmployeeDetail?.skills.map((item) => item.skill.name) ?? [],
            memoryCount: selectedEmployeeDetail?.artifactAccess.length ?? selectedEmployee._count.artifactAccess
          } : null}
          workflow={selectedWorkflow ? { name: selectedWorkflow.name, description: selectedWorkflow.description, steps: selectedWorkflow.steps.length } : null}
        />
      </div>
    </AppShell>
  );
}

function organisationCopy(value: string) {
  return value.replace(/\bcompany\b/gi, "organisation");
}

function EmployeeRail({
  employees,
  sessions
}: {
  employees: Array<{ id: string; active: boolean; description: string; displayName: string; online: boolean; skillCount: number }>;
  sessions: Array<{ href: string; title: string; active: boolean; employeeName: string; running: boolean }>;
}) {
  return (
    <aside className="border-b border-violetline bg-white p-4 xl:border-b-0">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">AI Employees</h1>
        <Link className="flex min-h-10 items-center rounded-2xl border border-violetline bg-[#fbf8ff] px-4 text-sm font-semibold text-copper" href="/employees">
          + New
        </Link>
      </div>
      <Link className="mb-3 flex min-h-11 items-center gap-3 rounded-2xl border border-violetline bg-paper px-3 text-sm font-semibold text-graphite" href="/employees">
        <Search size={17} />
        <span>Manage employees and roles</span>
      </Link>
      <details className="mb-4 xl:hidden">
        <summary className="min-h-11 cursor-pointer rounded-2xl border border-violetline bg-white px-4 py-3 text-sm font-semibold">Show employees and recent conversations</summary>
        <RailContent employees={employees} sessions={sessions} />
      </details>
      <div className="hidden xl:block">
        <RailContent employees={employees} sessions={sessions} />
      </div>
    </aside>
  );
}

function RailContent({
  employees,
  sessions
}: {
  employees: Array<{ id: string; active: boolean; description: string; displayName: string; online: boolean; skillCount: number }>;
  sessions: Array<{ href: string; title: string; active: boolean; employeeName: string; running: boolean }>;
}) {
  return (
    <div className="mt-4 space-y-5 xl:mt-0">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-graphite">Your employees</p>
        <div className="space-y-3">
          {employees.map((employee) => (
            <div
              className={`rounded-3xl border p-4 transition ${
                employee.active ? "border-forest bg-[#fbf8ff] shadow-sm" : "border-violetline bg-white hover:border-forest/30"
              }`}
              key={employee.id}
            >
              <div className="flex items-center gap-3">
                <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-[#f0e6ff] text-forest">
                  <PenLine size={20} />
                  <span className={`absolute -right-1 bottom-1 h-3 w-3 rounded-full border-2 border-white ${employee.online ? "bg-success" : "bg-warning"}`} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{employee.displayName}</p>
                  <p className="line-clamp-2 text-xs leading-5 text-graphite">{employee.description}</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-semibold text-forest">{employee.skillCount} skills enabled</p>
            </div>
          ))}
        </div>
      </div>
      {sessions.length ? (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-graphite">Recent conversations</p>
          <div className="space-y-2">
            {sessions.slice(0, 6).map((session) => (
              <Link className={`block rounded-2xl border px-3 py-3 text-sm ${session.active ? "border-forest bg-[#f5f0ff]" : "border-violetline bg-white"}`} href={session.href} key={session.href}>
                <p className="line-clamp-1 font-semibold">{session.title}</p>
                <p className="mt-1 text-xs text-graphite">{session.employeeName}{session.running ? " · Working" : ""}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WorkflowHeader({
  organisationName,
  selectedWorkflow,
  title
}: {
  organisationName: string;
  selectedWorkflow: { id: string; name: string; stepCount: number } | null;
  title: string;
}) {
  return (
    <header className="border-b border-violetline bg-white px-4 py-4 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-graphite">Current work instruction</p>
            <h2 className="mt-1 text-lg font-semibold">{selectedWorkflow?.name ?? title}</h2>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-graphite">
              {selectedWorkflow ? `Step 3 of ${Math.max(selectedWorkflow.stepCount, 3)}` : "Workspace"}
            </p>
            <h3 className="mt-1 text-sm font-semibold">{selectedWorkflow ? "Writing response" : organisationName}</h3>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#ede9fe]">
              <div className="h-full w-1/2 rounded-full bg-copper" />
            </div>
          </div>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-violetline bg-white px-5 text-sm font-semibold text-forest" href="/workflows">
          <Workflow size={17} />
          View instructions
        </Link>
      </div>
    </header>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="ml-auto max-w-[88%] rounded-[22px] bg-[#f5f0ff] px-5 py-4 text-sm leading-7 text-ink md:max-w-[72%]">
      {content}
    </div>
  );
}

function AssistantWorkspace({
  artifacts,
  content,
  employeeName
}: {
  artifacts: Array<{ id: string; title: string; kind: string; memoryStatus: string }>;
  content: string;
  employeeName: string;
}) {
  const summary = content.split("\n").find((line) => line.trim())?.replace(/^[-#*\s]+/, "").slice(0, 180) ?? "Response ready.";

  return (
    <article className="mr-auto max-w-[94%] overflow-hidden rounded-[24px] border border-violetline bg-white md:max-w-[84%]">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-forest text-white">
            <PenLine size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">{employeeName}</p>
            <p className="text-xs text-graphite">Structured response</p>
          </div>
        </div>
        <Badge tone="success">Done</Badge>
      </div>
      <section className="border-t border-violetline bg-paper px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">Summary</p>
        <p className="mt-2 text-sm leading-6 text-ink">{summary}</p>
      </section>
      <section className="px-5 py-4">
        <p className="whitespace-pre-wrap text-sm leading-7 text-graphite">{content}</p>
      </section>
      <KnowledgeGatheringCard artifacts={artifacts} />
      <section className="flex flex-wrap gap-2 border-t border-violetline px-5 py-4">
        {[
          ["Upload knowledge", "/artifacts"],
          ["Send to approvals", "/approvals"],
          ["Create task", "/tasks"],
          ["View instructions", "/workflows"]
        ].map(([action, href]) => (
          <Link className="inline-flex min-h-10 items-center rounded-full border border-violetline px-4 text-xs font-semibold text-ink hover:bg-[#f5f0ff]" href={href} key={action}>
            {action}
          </Link>
        ))}
      </section>
    </article>
  );
}

function KnowledgeGatheringCard({
  artifacts
}: {
  artifacts: Array<{ id: string; title: string; kind: string; memoryStatus: string }>;
}) {
  const items = artifacts.length
    ? artifacts.slice(0, 4).map((artifact) => [artifact.title, artifact.memoryStatus === "MEMORY_INDEXED" ? "Memory indexed" : "Artifact only"])
    : [["No approved files yet", "Upload knowledge"]];
  return (
    <section className="mx-5 mb-4 rounded-2xl border border-violetline bg-paper p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">Available knowledge</p>
        <ListChecks size={17} className="text-forest" />
      </div>
      <div className="space-y-3">
        {items.map(([label, source]) => (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm" key={label}>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success" />
              {label}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-graphite">{source}</span>
          </div>
        ))}
      </div>
      <Link className="mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl border border-violetline bg-white px-4 text-xs font-semibold text-forest" href="/artifacts">
        Manage files
      </Link>
    </section>
  );
}

function WorkingCard({ employeeName, status }: { employeeName: string; status: string }) {
  return (
    <article className="mr-auto max-w-[94%] rounded-[24px] border border-forest/20 bg-[#f5f0ff] px-5 py-4 md:max-w-[84%]">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-forest">
          <Clock3 className="animate-pulse" size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-forest">{employeeName} is working</p>
          <p className="mt-1 text-xs text-graphite">{status === "PENDING" ? "Getting started" : "Gathering context and drafting the answer"}</p>
        </div>
      </div>
    </article>
  );
}

function ContextPanel({
  activeJobs,
  artifacts,
  employee,
  workflow
}: {
  activeJobs: number;
  artifacts: Array<{ id: string; title: string; kind: string; memoryStatus: string }>;
  employee: { displayName: string; description: string; skills: string[]; memoryCount: number } | null;
  workflow: { name: string; description: string; steps: number } | null;
}) {
  return (
    <aside className="bg-white p-4 xl:overflow-y-auto">
      <details className="xl:hidden">
        <summary className="min-h-11 cursor-pointer rounded-2xl border border-violetline bg-[#fbf8ff] px-4 py-3 text-sm font-semibold text-forest">
          Context, files, and activity
        </summary>
        <div className="mt-4">
          <ContextContent activeJobs={activeJobs} artifacts={artifacts} employee={employee} workflow={workflow} />
        </div>
      </details>
      <div className="hidden xl:block">
        <ContextContent activeJobs={activeJobs} artifacts={artifacts} employee={employee} workflow={workflow} />
      </div>
    </aside>
  );
}

function ContextContent({
  activeJobs,
  artifacts,
  employee,
  workflow
}: {
  activeJobs: number;
  artifacts: Array<{ id: string; title: string; kind: string; memoryStatus: string }>;
  employee: { displayName: string; description: string; skills: string[]; memoryCount: number } | null;
  workflow: { name: string; description: string; steps: number } | null;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 rounded-full bg-paper p-1 text-center text-sm font-semibold">
        <span className="rounded-full bg-[#fde7f3] px-3 py-2 text-copper">Context</span>
        <span className="px-3 py-2 text-graphite">Files ({artifacts.length})</span>
        <span className="px-3 py-2 text-graphite">Activity</span>
      </div>

      {employee ? (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-graphite">Employee</p>
          <div className="rounded-3xl border border-violetline p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest text-white">
                <PenLine size={20} />
              </div>
              <div>
                <p className="font-semibold">{employee.displayName}</p>
                <p className="mt-1 text-sm leading-5 text-graphite">{employee.description}</p>
                <Badge tone="success">Online</Badge>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-graphite">Work instruction context</p>
        <div className="rounded-3xl border border-violetline p-4">
          <p className="font-semibold">{workflow?.name ?? "Direct chat"}</p>
          <p className="mt-1 text-sm text-graphite">{workflow?.description ?? "No work instruction selected."}</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#ede9fe]">
            <div className="h-full w-1/2 rounded-full bg-copper" />
          </div>
          <p className="mt-2 text-xs text-graphite">{workflow ? `${workflow.steps} instruction steps` : "Conversation mode"} · {activeJobs ? "Working" : "Ready"}</p>
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-graphite">Skills in use</p>
        <div className="space-y-2">
          {(employee?.skills.length ? employee.skills : ["Proposal Writing", "Research", "Email Drafting"]).map((skill) => (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-violetline px-3 py-2 text-sm" key={skill}>
              <span className="inline-flex items-center gap-2"><Sparkles size={15} className="text-forest" />{skill}</span>
              <Badge tone="success">Active</Badge>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-graphite">Knowledge sources</p>
        <div className="space-y-2">
          {artifacts.map((artifact) => (
            <div className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2 text-sm" key={artifact.id}>
              <span className="inline-flex min-w-0 items-center gap-2"><FileText size={15} /> <span className="truncate">{artifact.title}</span></span>
              <CheckCircle2 size={15} className={artifact.memoryStatus === "MEMORY_INDEXED" ? "text-success" : "text-warning"} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-violetline p-4">
        <p className="font-semibold">Approvals</p>
        <p className="mt-2 text-sm text-graphite">Manager approval required for external sends and sensitive actions.</p>
        <Link className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl border border-violetline text-sm font-semibold text-forest" href="/approvals">
          View all approvals
        </Link>
      </section>

      <section className="rounded-3xl border border-violetline p-4">
        <p className="font-semibold">Mailboxes</p>
        <p className="mt-2 flex items-center gap-2 text-sm text-graphite"><Mail size={15} /> Draft-only until approved.</p>
      </section>
    </div>
  );
}
