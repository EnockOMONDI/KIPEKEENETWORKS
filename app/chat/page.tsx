import { AppShell, Badge, EmptyState, PageHeader } from "@/components/AppShell";
import { ChatAutoRefresh } from "@/components/ChatAutoRefresh";
import { ChatComposer } from "@/components/ChatComposer";
import { chatAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Bot, CheckCircle2, Clock3, FileText, ListChecks, Sparkles } from "lucide-react";

export default async function ChatPage({
  searchParams
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [employees, sessions] = await Promise.all([
    prisma.companyEmployee.findMany({
      where: { companyId: user.companyId },
      orderBy: { displayName: "asc" }
    }),
    prisma.session.findMany({
      where: { companyId: user.companyId },
      include: {
        employee: true,
        hermesJobs: { orderBy: { createdAt: "desc" } },
        messages: { orderBy: { createdAt: "asc" } }
      },
      orderBy: { updatedAt: "desc" },
      take: 24
    })
  ]);
  const selectedSession = sessions.find((session) => session.id === params.session) ?? sessions[0] ?? null;
  const activeJobs = selectedSession?.hermesJobs.filter((job) => ["PENDING", "RUNNING"].includes(job.status)) ?? [];
  const selectedEmployeeId = selectedSession?.employeeId ?? employees[0]?.id;
  const projectTitle = selectedSession?.title ?? "New conversation";
  const projectMessages = selectedSession?.messages ?? [];

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <ChatAutoRefresh active={activeJobs.length > 0} />
      <PageHeader
        eyebrow="AI workroom"
        title="Chat with AI employees"
        description="A conversation is treated like a small project: request, working state, structured answer, tasks, files, and future deliverables."
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-h-[680px] rounded-lg border border-black/10 bg-white shadow-panel">
          <div className="border-b border-black/10 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-copper">
                  {selectedSession?.employee.displayName ?? "Choose an AI employee"}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{projectTitle}</h2>
              </div>
              <Badge tone={activeJobs.length ? "warning" : "success"}>
                {activeJobs.length ? "Working" : selectedSession ? "Ready" : "New"}
              </Badge>
            </div>
          </div>

          <div className="mx-auto flex min-h-[520px] max-w-4xl flex-col px-4 py-6">
            {employees.length ? (
              <form action={chatAction} className="sticky top-4 z-20 mb-6">
                <ChatComposer
                  conversations={sessions.map((session) => ({
                    active: selectedSession?.id === session.id,
                    employeeName: session.employee.displayName,
                    href: `/chat?session=${session.id}`,
                    messageCount: session.messages.length,
                    running: session.hermesJobs.some((job) => ["PENDING", "RUNNING"].includes(job.status)),
                    title: session.title
                  }))}
                  employees={employees}
                  selectedEmployeeId={selectedEmployeeId}
                  sessionId={selectedSession?.id}
                />
              </form>
            ) : (
              <div className="mb-6">
                <EmptyState title="No AI employees yet" description="Create at least one AI employee before starting a conversation." />
              </div>
            )}

            <div className="flex-1 space-y-5">
              {projectMessages.length ? (
                projectMessages.map((message) =>
                  message.role === "user" ? (
                    <UserBubble content={message.content} key={message.id} />
                  ) : (
                    <AssistantWorkspace content={message.content} employeeName={selectedSession?.employee.displayName ?? "AI employee"} key={message.id} />
                  )
                )
              ) : (
                <EmptyState
                  title="Start with a clear outcome"
                  description="Ask for a plan, draft, analysis, checklist, or decision. The answer will appear as a structured workspace instead of a plain message."
                />
              )}
              {activeJobs.map((job) => (
                <WorkingCard employeeName={job.employeeName} key={job.id} status={job.status} />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <InfoPanel
            icon={<ListChecks size={18} />}
            title="Project structure"
            lines={["Summary", "Tasks", "Generated outputs", "Decisions"]}
          />
          <InfoPanel
            icon={<FileText size={18} />}
            title="Next rich blocks"
            lines={["Files", "Tables", "Charts", "Images"]}
          />
          <InfoPanel
            icon={<Bot size={18} />}
            title="Next phase"
            lines={["Multi-agent collaboration", "Compiler response", "Role-by-role progress"]}
          />
        </aside>
      </div>
    </AppShell>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="ml-auto max-w-[82%] rounded-[24px] bg-ink px-5 py-4 text-sm leading-7 text-paper">
      {content}
    </div>
  );
}

function AssistantWorkspace({ content, employeeName }: { content: string; employeeName: string }) {
  const summary = content.split("\n").find((line) => line.trim())?.replace(/^[-#*\s]+/, "").slice(0, 180) ?? "Response ready.";

  return (
    <article className="mr-auto max-w-[92%] overflow-hidden rounded-[24px] border border-black/10 bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-forest/10 text-forest">
            <Sparkles size={17} />
          </div>
          <div>
            <p className="text-sm font-semibold">{employeeName}</p>
            <p className="text-xs text-graphite">Structured response</p>
          </div>
        </div>
        <Badge tone="success">Done</Badge>
      </div>
      <section className="border-b border-black/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-copper">Summary</p>
        <p className="mt-2 text-sm leading-6 text-ink">{summary}</p>
      </section>
      <section className="px-5 py-4">
        <details open>
          <summary className="cursor-pointer text-sm font-semibold text-ink">Answer</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-graphite">{content}</p>
        </details>
      </section>
      <section className="grid gap-2 border-t border-black/10 bg-white px-5 py-4 text-sm md:grid-cols-3">
        <button className="rounded-md border border-black/10 px-3 py-2 font-semibold text-ink">Create task</button>
        <button className="rounded-md border border-black/10 px-3 py-2 font-semibold text-ink">Send to approvals</button>
        <button className="rounded-md border border-black/10 px-3 py-2 font-semibold text-ink">Save decision</button>
      </section>
    </article>
  );
}

function WorkingCard({ employeeName, status }: { employeeName: string; status: string }) {
  return (
    <article className="mr-auto max-w-[92%] rounded-[24px] border border-forest/20 bg-forest/5 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-forest">
          <Clock3 className="animate-pulse" size={17} />
        </div>
        <div>
          <p className="text-sm font-semibold text-forest">{employeeName} is working</p>
          <p className="mt-1 text-xs text-graphite">{status === "PENDING" ? "Getting started" : "Reading memory and drafting the answer"}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
        <ProgressStep done label="Request received" />
        <ProgressStep done={status === "RUNNING"} label="Thinking" />
        <ProgressStep done={false} label="Preparing answer" />
      </div>
    </article>
  );
}

function ProgressStep({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-graphite">
      {done ? <CheckCircle2 className="text-forest" size={14} /> : <Clock3 size={14} />}
      {label}
    </div>
  );
}

function InfoPanel({ icon, lines, title }: { icon: React.ReactNode; lines: string[]; title: string }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-paper text-forest">{icon}</div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <p className="rounded-md bg-paper px-3 py-2 text-sm text-graphite" key={line}>
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
