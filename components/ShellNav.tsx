"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Building2,
  CalendarClock,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
  Inbox,
  Mail,
  MessageSquare,
  PlugZap,
  Settings,
  Upload,
  Users,
  UserPlus
} from "lucide-react";

const icons = {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Building2,
  CalendarClock,
  CircleHelp,
  CreditCard,
  FileText,
  Home,
  Inbox,
  Mail,
  MessageSquare,
  PlugZap,
  Settings,
  Upload,
  Users,
  UserPlus
};

export function ShellNav({
  compact = false,
  links
}: {
  compact?: boolean;
  links: ReadonlyArray<{ href: string; label: string; icon: keyof typeof icons }>;
}) {
  const pathname = usePathname();

  return (
    <nav className={compact ? "flex gap-2" : "space-y-1.5"}>
      {links.map((item) => {
        const Icon = icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
              compact ? "shrink-0 whitespace-nowrap border border-violetline bg-white" : ""
            } ${
              active
                ? "bg-[#f0e6ff] text-forest shadow-sm"
                : "text-ink/80 hover:bg-[#f5f0ff] hover:text-forest"
            }`}
            href={item.href}
            key={item.href}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
