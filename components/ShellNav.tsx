"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  CalendarClock,
  CircleHelp,
  CreditCard,
  Home,
  Inbox,
  MessageSquare,
  PlugZap,
  Settings,
  Upload,
  Users,
  UserPlus
} from "lucide-react";

const icons = {
  Activity,
  Bot,
  CalendarClock,
  CircleHelp,
  CreditCard,
  Home,
  Inbox,
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
    <nav className={compact ? "flex gap-2" : "space-y-1"}>
      {links.map((item) => {
        const Icon = icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
              compact ? "shrink-0 whitespace-nowrap border border-black/10" : ""
            } ${
              active
                ? "bg-ink text-paper shadow-sm"
                : "text-graphite hover:bg-paper hover:text-ink"
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
