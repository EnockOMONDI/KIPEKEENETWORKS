"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Square } from "lucide-react";

const workingMessages = [
  "Getting started",
  "Reading approved context",
  "Checking work instructions",
  "Preparing response",
  "Almost there"
];

export function ChatAutoRefresh({
  active,
  sessionId
}: {
  active: boolean;
  sessionId?: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active || !sessionId) {
      return;
    }

    const activeSessionId = sessionId;
    let stopped = false;
    let timer: number | undefined;

    async function poll() {
      try {
        const response = await fetch(`/api/chat/status?session=${encodeURIComponent(activeSessionId)}`, {
          cache: "no-store"
        });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!stopped && data?.active === false) {
          stopped = true;
          router.refresh();
          return;
        }
      } finally {
        if (!stopped) {
          timer = window.setTimeout(poll, 1800);
        }
      }
    }

    timer = window.setTimeout(poll, 1200);

    return () => {
      stopped = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [active, router, sessionId]);

  return null;
}

export function JobWorkingText({ status }: { status: string }) {
  const [index, setIndex] = useState(0);
  const messages = useMemo(
    () => status === "PENDING" ? workingMessages : workingMessages.slice(1),
    [status]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, 1600);

    return () => window.clearInterval(timer);
  }, [messages.length]);

  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="animate-spin" size={14} />
      {messages[index]}
    </span>
  );
}

export function CancelJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function cancelJob() {
    startTransition(async () => {
      await fetch(`/api/chat/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: "POST"
      });
      router.refresh();
    });
  }

  return (
    <button
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-violetline bg-white px-3 text-xs font-semibold text-ink transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      onClick={cancelJob}
      type="button"
    >
      {pending ? <Loader2 className="animate-spin" size={14} /> : <Square size={13} />}
      Stop
    </button>
  );
}
