"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowUp, Loader2 } from "lucide-react";
import { WorkingText } from "./Interactive";

function ChatSubmit() {
  const { pending } = useFormStatus();

  return (
    <>
      <WorkingText active={pending} />
      <button
        aria-label="Send message"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-paper transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
      >
        {pending ? <Loader2 className="animate-spin" size={18} /> : <ArrowUp size={18} />}
      </button>
    </>
  );
}

export function ChatComposer({
  conversations = [],
  employees,
  selectedEmployeeId,
  sessionId
}: {
  conversations?: Array<{
    active: boolean;
    employeeName: string;
    href: string;
    messageCount: number;
    running: boolean;
    title: string;
  }>;
  employees: Array<{ id: string; displayName: string; hermesProfile: string | null }>;
  selectedEmployeeId?: string;
  sessionId?: string;
}) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-3 shadow-panel">
      {conversations.length ? (
        <div className="mb-3 flex gap-2 overflow-x-auto border-b border-black/10 pb-3">
          {conversations.map((conversation) => (
            <Link
              className={`min-w-48 shrink-0 rounded-2xl border px-3 py-2 text-left transition ${
                conversation.active
                  ? "border-ink bg-ink text-paper"
                  : "border-black/10 bg-paper text-ink hover:border-copper/40"
              }`}
              href={conversation.href}
              key={conversation.href}
            >
              <p className="line-clamp-1 text-sm font-semibold">{conversation.title}</p>
              <p className={`mt-1 text-xs ${conversation.active ? "text-white/70" : "text-graphite"}`}>
                {conversation.employeeName} · {conversation.messageCount} messages
              </p>
              {conversation.running ? (
                <p className={`mt-1 text-xs font-semibold ${conversation.active ? "text-white" : "text-forest"}`}>
                  Working...
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-black/10 pb-3">
        {sessionId ? <input name="sessionId" type="hidden" value={sessionId} /> : null}
        <select
          className="rounded-full border border-black/10 bg-paper px-3 py-2 text-sm font-semibold text-ink outline-none"
          defaultValue={selectedEmployeeId}
          name="employeeId"
          required
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.displayName}
            </option>
          ))}
        </select>
        <span className="rounded-full bg-forest/10 px-3 py-2 text-xs font-semibold text-forest">
          Company scoped
        </span>
      </div>
      <div className="flex items-end gap-3">
        <textarea
          className="max-h-52 min-h-20 flex-1 resize-none rounded-2xl bg-paper px-4 py-3 text-sm leading-6 outline-none placeholder:text-graphite"
          name="prompt"
          placeholder="Ask an AI employee to draft, analyze, plan, summarize, or prepare next actions..."
          required
        />
        <ChatSubmit />
      </div>
    </div>
  );
}
