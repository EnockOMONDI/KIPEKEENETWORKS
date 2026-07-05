import Link from "next/link";
import {
  Bell,
  Bot,
  ChevronDown,
  FileText,
  Gift,
  Hexagon,
  Search,
  UserCircle2
} from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { isKipekeeAdmin } from "@/lib/roles";
import { SubmitButton } from "./Interactive";
import { ShellNav } from "./ShellNav";

const links = [
  { href: "/dashboard", label: "Home", icon: "Home", audience: "all" },
  { href: "/organisations", label: "Organisations", icon: "Building2", audience: "all" },
  { href: "/employees", label: "AI Employees", icon: "Bot", audience: "all" },
  { href: "/workflows", label: "Work Instructions", icon: "CalendarClock", audience: "manager" },
  { href: "/chat", label: "Conversations", icon: "MessageSquare", audience: "all" },
  { href: "/knowledge", label: "Knowledge", icon: "Brain", audience: "all" },
  { href: "/documents", label: "Documents", icon: "FileText", audience: "all" },
  { href: "/mailboxes", label: "Mailboxes", icon: "Mail", audience: "manager" },
  { href: "/integrations", label: "Integrations", icon: "PlugZap", audience: "manager" },
  { href: "/tasks", label: "Tasks", icon: "Inbox", audience: "all" },
  { href: "/team", label: "Team", icon: "Users", audience: "manager" },
  { href: "/billing", label: "Billing", icon: "CreditCard", audience: "billing" },
  { href: "/systems", label: "Systems", icon: "Activity", audience: "kipekee" },
  { href: "/onboarding", label: "Client Onboarding", icon: "UserPlus", audience: "kipekee" }
] as const;

const helpLinks = [
  { href: "/company-settings", label: "Settings", icon: "Settings", audience: "manager" },
  { href: "/help", label: "Help", icon: "CircleHelp", audience: "all" }
] as const;

export function AppShell({
  children,
  companyName,
  userEmail,
  userRole = "MEMBER",
  platformRole,
  companySlug = "",
  fullBleed = false
}: {
  children: React.ReactNode;
  companyName: string;
  userEmail: string;
  userRole?: string;
  platformRole?: string;
  companySlug?: string;
  fullBleed?: boolean;
}) {
  const user = { role: platformRole ?? userRole, memberRole: userRole, company: { slug: companySlug } };
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
  const primaryMobileLinks = visibleLinks.slice(0, 5);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-violetline bg-[#fbf8ff]/95 px-4 py-5 xl:flex">
        <Link className="mb-5 flex min-h-14 shrink-0 items-center justify-between gap-3 rounded-3xl px-2" href="/dashboard">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-forest to-copper text-white shadow-panel">
              <Hexagon size={22} />
            </div>
            <div>
              <p className="font-semibold leading-5">Kipekee</p>
              <p className="text-xs text-graphite">AI Workspace</p>
            </div>
          </div>
          <ChevronDown size={17} className="text-forest" />
        </Link>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ShellNav links={visibleLinks} />
          <div className="my-4 border-t border-violetline" />
          <ShellNav links={visibleHelpLinks} />
        </div>

        <div className="mt-4 shrink-0 space-y-3">
          <div className="rounded-2xl border border-violetline bg-gradient-to-br from-[#fff5fd] to-[#f3e8ff] p-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-copper shadow-sm">
                <Gift size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Upgrade and save 40%</p>
                <p className="truncate text-[11px] text-graphite">More instructions and storage</p>
              </div>
            </div>
            <Link className="mt-3 flex min-h-9 w-full items-center justify-center rounded-xl bg-gradient-to-r from-forest to-copper px-3 text-xs font-semibold text-white" href="/billing">
              Upgrade Now
            </Link>
          </div>
          <form action={logoutAction} className="rounded-2xl border border-violetline bg-white p-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f0e6ff] text-forest">
                <UserCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{userEmail.split("@")[0]}</p>
                <p className="text-xs text-graphite">Owner</p>
              </div>
            </div>
            <SubmitButton className="w-full rounded-2xl" pendingText="Signing out" variant="secondary">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>

      <section className="min-h-screen pb-20 xl:pl-[264px] xl:pb-0">
        <TopBar companyName={companyName} userEmail={userEmail} />
        <div className={fullBleed ? "px-3 py-4 sm:px-5 xl:px-0 xl:py-0" : "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8"}>
          {children}
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-violetline bg-white/95 px-2 py-2 shadow-[0_-12px_30px_rgba(17,24,39,0.08)] backdrop-blur xl:hidden">
        <div className="grid grid-cols-5 gap-1">
          {primaryMobileLinks.map((link) => (
            <Link className="flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 text-center text-[11px] font-semibold text-graphite hover:bg-[#f5f0ff] hover:text-forest" href={link.href} key={`${link.href}-${link.label}`}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}

function TopBar({ companyName, userEmail }: { companyName: string; userEmail: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-violetline bg-white/90 px-4 py-3 backdrop-blur sm:px-6 xl:px-6">
      <div className="flex items-center gap-3">
        <Link className="hidden min-h-11 w-full max-w-[430px] items-center gap-3 rounded-2xl border border-violetline bg-paper px-4 text-sm text-graphite md:flex" href="/knowledge">
          <Search size={18} />
          <span className="w-full">Search workspace knowledge</span>
          <span className="rounded-lg border border-violetline bg-white px-2 py-1 text-xs font-semibold">⌘ K</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Pill href="/organisations" label="Organisation" value={companyName} />
          <Pill href="/employees" icon={<Bot size={17} />} label="Employee" value="AI employee" />
          <Link aria-label="Notifications" className="relative grid h-11 w-11 place-items-center rounded-2xl border border-violetline bg-white text-ink" href="/approvals">
            <Bell size={19} />
            <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-copper text-[10px] font-bold text-white">3</span>
          </Link>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f0e6ff] text-forest">
            <UserCircle2 size={23} />
          </div>
        </div>
      </div>
      <Link className="mt-3 flex min-h-11 items-center gap-3 rounded-2xl border border-violetline bg-paper px-4 text-sm text-graphite md:hidden" href="/knowledge">
        <Search size={18} />
        <span className="w-full">Search workspace knowledge</span>
      </Link>
    </header>
  );
}

function Pill({ href, icon, label, value }: { href: string; icon?: React.ReactNode; label: string; value: string }) {
  return (
    <Link className="hidden min-h-11 items-center gap-2 rounded-2xl border border-violetline bg-white px-3 text-left sm:flex" href={href}>
      {icon ? <span className="text-forest">{icon}</span> : <FileText size={17} className="text-forest" />}
      <div>
        <p className="text-[11px] leading-3 text-graphite">{label}</p>
        <p className="max-w-32 truncate text-sm font-semibold leading-5">{value}</p>
      </div>
      <ChevronDown size={15} className="text-graphite" />
    </Link>
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
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-forest">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-normal text-ink">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-graphite">{description}</p>
    </header>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl border border-violetline bg-white p-5 shadow-panel">{children}</section>;
}

export function Notice({
  description,
  title,
  tone = "neutral"
}: {
  description: string;
  title: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const styles = {
    neutral: "border-violetline bg-white text-ink",
    success: "border-forest/20 bg-forest/5 text-forest",
    warning: "border-copper/25 bg-[#fff7ed] text-copper"
  };

  return (
    <div className={`mb-5 rounded-3xl border px-4 py-3 text-sm leading-6 ${styles[tone]}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-graphite">{description}</p>
    </div>
  );
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
    <section className="rounded-3xl border border-dashed border-violetline bg-white p-8 text-center">
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
    neutral: "bg-[#f5f0ff] text-graphite",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger"
  };

  return <span className={`h-fit rounded-full px-3 py-1.5 text-xs font-semibold ${styles[tone]}`}>{children}</span>;
}
