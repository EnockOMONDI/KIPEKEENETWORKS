import { AppShell, Badge, Card, EmptyState, PageHeader } from "@/components/AppShell";
import { SubmitButton } from "@/components/Interactive";
import { planIntegrationAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageCompany } from "@/lib/roles";
import { CalendarDays, Cloud, Mail, MessageCircle, PlugZap, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";

const catalog = [
  {
    provider: "whatsapp",
    displayName: "WhatsApp Business",
    scopes: "Read approved conversations, draft replies, send only after approval",
    icon: MessageCircle
  },
  {
    provider: "gmail",
    displayName: "Gmail / Google Workspace Mail",
    scopes: "Draft email, summarize threads, search approved mailboxes",
    icon: Mail
  },
  {
    provider: "outlook",
    displayName: "Microsoft Outlook",
    scopes: "Draft email, summarize threads, search approved mailboxes",
    icon: Mail
  },
  {
    provider: "google-drive",
    displayName: "Google Drive",
    scopes: "Search approved folders, read selected documents, index approved files",
    icon: Cloud
  },
  {
    provider: "google-calendar",
    displayName: "Google Calendar",
    scopes: "Read availability, suggest meeting times, draft calendar events",
    icon: CalendarDays
  },
  {
    provider: "crm",
    displayName: "CRM",
    scopes: "Read leads, summarize accounts, draft follow-ups, update only after approval",
    icon: UsersRound
  }
];

export default async function IntegrationsPage() {
  const user = await requireUser();
  if (!canManageCompany(user)) {
    redirect("/dashboard");
  }
  const connections = await prisma.integrationConnection.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" }
  });
  const connectionMap = new Map(connections.map((connection) => [connection.provider, connection]));

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Connected services"
        title="Integrations"
        description="Connect client tools through Kipekee-controlled permissions. AI employees can use approved services, but external actions still pass through approval rules."
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-3 md:grid-cols-2">
          {catalog.map((item) => {
            const Icon = item.icon;
            const connection = connectionMap.get(item.provider);

            return (
              <Card key={item.provider}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-paper text-forest">
                      <Icon size={19} />
                    </div>
                    <div>
                      <h2 className="font-semibold">{item.displayName}</h2>
                      <p className="mt-2 text-sm leading-6 text-graphite">{item.scopes}</p>
                    </div>
                  </div>
                  <Badge tone={connection ? "warning" : "neutral"}>
                    {connection?.status ?? "Available"}
                  </Badge>
                </div>
                <form action={planIntegrationAction} className="mt-4">
                  <input name="provider" type="hidden" value={item.provider} />
                  <input name="displayName" type="hidden" value={item.displayName} />
                  <input name="scopes" type="hidden" value={item.scopes} />
                  <SubmitButton className="w-full" pendingText="Saving integration plan" variant={connection ? "secondary" : "primary"}>
                    {connection ? "Update request" : "Request connection"}
                  </SubmitButton>
                </form>
              </Card>
            );
          })}
        </div>
        <div className="space-y-5">
          <Card>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-paper">
                <PlugZap size={18} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Integration policy</h2>
                <p className="text-sm text-graphite">Approval-first access</p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-graphite">
              <p>Each connection belongs to one company workspace.</p>
              <p>Each employee should be granted only the services it needs.</p>
              <p>Sending messages, updating CRMs, or creating calendar events should require approval until the client explicitly relaxes that rule.</p>
            </div>
          </Card>
          {connections.length ? (
            <Card>
              <h2 className="text-lg font-semibold">Requested connections</h2>
              <div className="mt-4 space-y-3">
                {connections.map((connection) => (
                  <div className="rounded-md bg-paper p-3" key={connection.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{connection.displayName}</p>
                      <Badge tone="warning">{connection.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-graphite">{connection.scopes}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <EmptyState
              title="No integrations requested"
              description="Request the services this company needs. Real OAuth/API setup will be connected one provider at a time."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
