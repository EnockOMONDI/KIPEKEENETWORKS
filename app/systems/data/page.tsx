import { redirect } from "next/navigation";
import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { KnowledgeCard, SystemSubnav } from "@/components/SystemKnowledge";
import { dataArchitecture } from "@/lib/architecture-knowledge";
import { requireUser } from "@/lib/auth";
import { isKipekeeAdmin } from "@/lib/roles";

const modelGroups = [
  {
    title: "Identity and tenancy",
    models: ["User", "Workspace", "WorkspaceMember", "Company", "CompanyRuntime", "AuthSession", "TeamInvite"]
  },
  {
    title: "AI workforce",
    models: ["EmployeeTemplate", "CompanyEmployee", "Skill", "EmployeeSkill", "Workflow", "WorkflowStep", "EmployeeWorkflow", "WorkflowTemplate", "IndustryTemplate"]
  },
  {
    title: "Knowledge and memory",
    models: ["KnowledgeCollection", "Artifact", "KnowledgeChunk", "ArtifactAccess"]
  },
  {
    title: "Conversation and execution",
    models: ["Session", "Message", "HermesJob", "WorkerHeartbeat", "AuditLog", "ApprovalRequest"]
  },
  {
    title: "Billing",
    models: ["OnboardingPackage", "Subscription", "Invoice"]
  },
  {
    title: "Integrations and mailboxes",
    models: ["IntegrationConnection", "IntegrationAccess", "Mailbox", "MailboxAccess", "EmailMessage", "EmailDraft"]
  },
  {
    title: "Abuse control",
    models: ["RateLimitBucket"]
  }
];

export default async function DataPage() {
  const user = await requireUser();
  if (!isKipekeeAdmin(user)) {
    redirect("/dashboard");
  }

  return (
    <AppShell companyName={user.company?.name ?? "Kipekee Studio"} companySlug={user.company?.slug ?? "kipekee-studio"} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <SystemSubnav />
      <PageHeader
        eyebrow="Data architecture"
        title="Prisma model map"
        description="Model groups and data boundaries verified from prisma/schema.prisma and the current page/action queries."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {modelGroups.map((group) => (
          <Card key={group.title}>
            <h2 className="text-xl font-semibold">{group.title}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.models.map((model) => (
                <span className="rounded-2xl bg-paper px-3 py-2 text-sm font-semibold text-graphite" key={model}>
                  {model}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {dataArchitecture.map((item) => (
          <KnowledgeCard item={item} key={item.title} />
        ))}
      </section>
    </AppShell>
  );
}
