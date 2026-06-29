import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  LockKeyhole,
  Network,
  ShieldCheck,
  Users
} from "lucide-react";
import Link from "next/link";
import { onboardingPackages } from "@/lib/seed-data";

const workforce = [
  "CEO Assistant",
  "Creative Director",
  "Marketing Manager",
  "Proposal Writer",
  "Finance Assistant",
  "Software Engineer",
  "Brand Manager",
  "Social Media Manager",
  "Research Analyst",
  "Customer Support",
  "Sales Assistant"
];

const loops = [
  "Daily CEO brief",
  "Weekly marketing plan",
  "Proposal follow-up scan",
  "Finance reminders",
  "Lead research",
  "Content calendar",
  "Client support triage"
];

const accessOptions = [
  "CEO Assistant",
  "Marketing Manager",
  "Finance Assistant",
  "Research Assistant",
  "Sales Assistant",
  "Customer Support",
  "All company AI employees",
  "Only me"
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-black/10 bg-paper/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-ink text-paper">
              <Network size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-copper">
                Kipekee Studio
              </p>
              <h1 className="text-xl font-semibold text-ink">Kipekee Networks</h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 text-sm text-graphite md:flex">
            <span className="rounded-md border border-black/10 bg-white px-3 py-2">
              Hermes hidden orchestration
            </span>
            <Link className="rounded-md border border-black/10 bg-white px-3 py-2 font-semibold text-ink" href="/login">
              Sign in
            </Link>
            <Link className="rounded-md bg-forest px-3 py-2 font-semibold text-white" href="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col justify-center">
          <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-md bg-skyglass px-3 py-2 text-sm font-semibold text-forest">
            <BriefcaseBusiness size={16} />
            AI workforce platform for African businesses
          </p>
          <h2 className="max-w-3xl text-5xl font-semibold leading-[1.03] text-ink">
            Hire AI employees trained on your business.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-graphite">
            Kipekee Networks sells digital employees, not chatbots, credits, tokens,
            prompts, or model access. Companies get private workspaces with AI employees,
            document memory, sessions, loops, approvals, and controlled access.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-md bg-ink px-5 py-3 text-sm font-semibold text-paper" href="/login">
              Sign in to workspace
            </Link>
            <Link className="rounded-md border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-ink" href="/dashboard">
              Open dashboard
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric label="Monthly user subscription" value="KES 4,500" />
            <Metric label="Starter onboarding" value="KES 5,000" />
            <Metric label="Business onboarding" value="KES 15,000" />
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-panel">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">
                Workspace
              </p>
              <h3 className="text-2xl font-semibold">Kipekee Studio</h3>
            </div>
            <span className="rounded-md bg-forest/10 px-3 py-2 text-sm font-medium text-forest">
              Active
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workforce.map((employee) => (
              <div
                className="flex items-center gap-3 rounded-md border border-black/10 bg-paper px-3 py-3"
                key={employee}
              >
                <CheckCircle2 className="text-forest" size={18} />
                <span className="text-sm font-medium">{employee}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-3">
        <Panel
          icon={<FileText size={20} />}
          title="Artifacts and Document Memory"
          eyebrow="Controlled knowledge"
        >
          <p className="text-sm leading-6 text-graphite">
            Uploaded files are artifacts first. Users decide whether each artifact becomes
            memory and which AI employees can access it.
          </p>
          <div className="mt-4 rounded-md border border-black/10 bg-paper p-4">
            <p className="mb-3 text-sm font-semibold">Who can access this document?</p>
            <div className="grid gap-2">
              {accessOptions.map((option, index) => (
                <label className="flex items-center gap-2 text-sm" key={option}>
                  <input defaultChecked={index === 1} type="checkbox" />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </Panel>

        <Panel icon={<Clock3 size={20} />} title="Scheduled Loops" eyebrow="Not just chat">
          <p className="text-sm leading-6 text-graphite">
            Kipekee employees can run recurring business loops with memory scope, tool
            limits, output targets, and approval gates.
          </p>
          <div className="mt-4 grid gap-2">
            {loops.map((loop) => (
              <div className="rounded-md bg-paper px-3 py-2 text-sm" key={loop}>
                {loop}
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={<ShieldCheck size={20} />} title="Approvals and Isolation" eyebrow="Trust layer">
          <div className="space-y-4 text-sm leading-6 text-graphite">
            <p>
              Agents can draft, summarize, analyze, and prepare work. Humans approve
              sensitive or external actions.
            </p>
            <div className="rounded-md border border-black/10 bg-paper p-4">
              <p className="font-semibold text-ink">Client isolation rule</p>
              <ul className="mt-2 space-y-2">
                <li>Small clients: shared infrastructure, tenant-scoped requests.</li>
                <li>Higher-risk clients: separate Hermes home/profile/container.</li>
                <li>Enterprise: isolated deployment if paid.</li>
              </ul>
            </div>
          </div>
        </Panel>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="rounded-lg border border-black/10 bg-white p-6 shadow-panel">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">
                Commercial model
              </p>
              <h3 className="mt-1 text-3xl font-semibold">Setup fee plus monthly users</h3>
            </div>
            <div className="rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper">
              Monthly subscription: KES 4,500 per user
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {onboardingPackages.map((pkg) => (
              <article className="rounded-lg border border-black/10 bg-paper p-4" key={pkg.name}>
                <h4 className="text-lg font-semibold">{pkg.name}</h4>
                <p className="mt-2 text-2xl font-semibold text-forest">
                  {pkg.priceKes ? `KES ${pkg.priceKes.toLocaleString()}` : "Quoted"}
                </p>
                <p className="mt-3 text-sm leading-6 text-graphite">{pkg.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-black/10 bg-ink p-6 text-paper">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-white/10">
              <LockKeyhole size={22} />
            </div>
            <h3 className="text-2xl font-semibold">Hermes stays invisible.</h3>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Kipekee owns customers, billing, users, company data, approvals, and the
              portal. Hermes handles hidden orchestration: profiles, skills, tools, model
              routing, memory, loops, and execution.
            </p>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-6 shadow-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">
              Phase 1 status
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Status icon={<Users size={18} />} text="Kipekee Studio workspace seeded" />
              <Status icon={<BriefcaseBusiness size={18} />} text="AI employee catalog defined" />
              <Status icon={<FileText size={18} />} text="Artifact and memory model designed" />
              <Status icon={<Clock3 size={18} />} text="Loop model prepared" />
              <Status icon={<ShieldCheck size={18} />} text="Approval-first policy included" />
              <Status icon={<Activity size={18} />} text="Audit log foundation included" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4 shadow-panel">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm text-graphite">{label}</p>
    </div>
  );
}

function Panel({
  children,
  eyebrow,
  icon,
  title
}: {
  children: React.ReactNode;
  eyebrow: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-5 shadow-panel">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-skyglass text-forest">
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{title}</h3>
        </div>
      </div>
      {children}
    </article>
  );
}

function Status({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-black/10 bg-paper px-3 py-3">
      <span className="text-forest">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
