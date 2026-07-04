import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { requireCompanyContext } from "@/lib/auth";

const items = [
  {
    title: "AI Employees",
    body: "These are organisation-owned digital staff. They use approved organisation knowledge and permissions."
  },
  {
    title: "Knowledge",
    body: "Uploaded files are artifacts first. Managers decide whether they become memory and which employees can access them."
  },
  {
    title: "Approvals",
    body: "Sensitive work, loop outputs, and external actions should be reviewed before anything leaves the workspace."
  },
  {
    title: "Integrations",
    body: "Connected services belong to the organisation and should be granted to employees only where needed."
  }
];

export default async function HelpPage() {
  const user = await requireCompanyContext();

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} platformRole={user.role} userRole={user.memberRole ?? user.role}>
      <PageHeader
        eyebrow="Support"
        title="Help"
        description="A short guide to how Kipekee Networks works inside an organisation workspace."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Card key={item.title}>
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-graphite">{item.body}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
