"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowUp, Loader2, Plus } from "lucide-react";
import { WorkingText } from "./Interactive";

function ChatSubmit() {
  const { pending } = useFormStatus();

  return (
    <>
      <WorkingText active={pending} />
      <button
        aria-label="Send message"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-copper text-white transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-70"
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
  sessionId,
  workflows = []
}: {
  conversations?: Array<{
    active: boolean;
    employeeName: string;
    href: string;
    messageCount: number;
    running: boolean;
    title: string;
  }>;
  employees: Array<{ id: string; displayName: string }>;
  selectedEmployeeId?: string;
  sessionId?: string;
  workflows?: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="rounded-[26px] border border-violetline bg-white p-3 shadow-panel">
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
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-violetline pb-3">
        {sessionId ? <input name="sessionId" type="hidden" value={sessionId} /> : null}
        <select
          className="min-h-10 rounded-full border border-violetline bg-paper px-3 py-2 text-sm font-semibold text-ink outline-none"
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
          Organisation runtime
        </span>
        {workflows.length ? (
          <select
            className="min-h-10 rounded-full border border-violetline bg-paper px-3 py-2 text-sm font-semibold text-ink outline-none"
            name="workflowId"
            defaultValue=""
          >
            <option value="">Direct chat</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="flex items-end gap-3">
        <Link aria-label="Add file or command" className="mb-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f5f0ff] text-forest" href="/artifacts">
          <Plus size={18} />
        </Link>
        <textarea
          className="max-h-52 min-h-20 flex-1 resize-none rounded-2xl bg-paper px-4 py-3 text-sm leading-6 outline-none placeholder:text-graphite"
          name="prompt"
          placeholder="Ask anything or type a command..."
          required
        />
        <ChatSubmit />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs font-semibold text-graphite">
        {["/proposal", "/email", "/upload", "/summarize", "/task", "/workflow"].map((command) => (
          <span className="shrink-0 rounded-xl bg-[#f5f0ff] px-3 py-2" key={command}>
            {command}
          </span>
        ))}
      </div>
    </div>
  );
}
