import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { SubmitButton } from "./Interactive";
import { ShellNav } from "./ShellNav";
import { isKipekeeAdmin } from "@/lib/roles";
import { FileText } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Home", icon: "Home", audience: "all" },
  { href: "/chat", label: "Chats", icon: "MessageSquare", audience: "all" },
  { href: "/employees", label: "AI Employees", icon: "Bot", audience: "all" },
  { href: "/artifacts", label: "Knowledge", icon: "Upload", audience: "all" },
  { href: "/integrations", label: "Integrations", icon: "PlugZap", audience: "manager" },
  { href: "/approvals", label: "Approvals", icon: "Inbox", audience: "all" },
  { href: "/loops", label: "Activity", icon: "CalendarClock", audience: "manager" },
  { href: "/team", label: "Team", icon: "Users", audience: "manager" },
  { href: "/billing", label: "Billing", icon: "CreditCard", audience: "billing" },
  { href: "/onboarding", label: "Client Onboarding", icon: "UserPlus", audience: "kipekee" }
] as const;

const helpLinks = [
  { href: "/company-settings", label: "Company Settings", icon: "Settings", audience: "manager" },
  { href: "/help", label: "Help", icon: "CircleHelp", audience: "all" }
] as const;

export function AppShell({
  children,
  companyName,
  userEmail,
  userRole = "MEMBER",
  companySlug = ""
}: {
  children: React.ReactNode;
  companyName: string;
  userEmail: string;
  userRole?: string;
  companySlug?: string;
}) {
  const user = { role: userRole, company: { slug: companySlug } };
  const platformAdmin = isKipekeeAdmin(user);
  const manager = platformAdmin || ["CLIENT_OWNER", "CLIENT_ADMIN", "OWNER", "ADMIN"].includes(userRole);
  const billing = platformAdmin || ["CLIENT_OWNER", "OWNER"].includes(userRole);
  const visibleLinks = links.filter((link) => {
    if (link.audience === "all") return true;
    if (link.audience === "kipekee") return platformAdmin;
    if (link.audience === "manager") return manager;
    if (link.audience === "billing") return billing;
    return false;
  });
  const visibleHelpLinks = helpLinks.filter((link) => {
    if (link.audience === "all") return true;
    if (link.audience === "manager") return manager;
    return false;
  });

  return (
    <main className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-black/10 bg-white p-5 lg:block">
        <Link className="mb-8 flex items-center gap-3" href="/dashboard">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-paper">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-copper">
              Kipekee Networks
            </p>
            <p className="font-semibold">{companyName}</p>
          </div>
        </Link>
        <ShellNav links={visibleLinks} />
        <div className="my-4 border-t border-black/10" />
        <ShellNav links={visibleHelpLinks} />
        <form action={logoutAction} className="absolute bottom-5 left-5 right-5">
          <p className="mb-3 text-xs text-graphite">{userEmail}</p>
          <SubmitButton pendingText="Signing out" variant="secondary">
            Sign out
          </SubmitButton>
        </form>
      </aside>
      <section className="lg:pl-72">
        <div className="border-b border-black/10 bg-white px-5 py-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-ink text-paper">
              <FileText size={18} />
            </div>
            <div>
              <p className="font-semibold">Kipekee Networks</p>
              <p className="text-sm text-graphite">{companyName}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto pb-1">
            <ShellNav compact links={visibleLinks} />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
      </section>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-7">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-graphite">{description}</p>
    </header>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-lg border border-black/10 bg-white p-5 shadow-panel">{children}</section>;
}

export function EmptyState({
  action,
  description,
  title
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-dashed border-black/15 bg-white p-8 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-graphite">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const styles = {
    neutral: "bg-paper text-graphite",
    success: "bg-forest/10 text-forest",
    warning: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-700"
  };

  return <span className={`h-fit rounded-md px-3 py-1.5 text-xs font-semibold ${styles[tone]}`}>{children}</span>;
}
