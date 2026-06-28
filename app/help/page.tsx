import { AppShell, Card, PageHeader } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

const items = [
  {
    title: "AI Employees",
    body: "These are company-owned digital staff. They use approved company knowledge and permissions."
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
    body: "Connected services belong to the company and should be granted to employees only where needed."
  }
];

export default async function HelpPage() {
  const user = await requireUser();

  return (
    <AppShell companyName={user.company.name} companySlug={user.company.slug} userEmail={user.email} userRole={user.role}>
      <PageHeader
        eyebrow="Support"
        title="Help"
        description="A short guide to how Kipekee Networks works inside a company workspace."
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
