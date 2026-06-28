"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

export function SubmitButton({
  children,
  className = "",
  pendingText = "Working",
  variant = "primary"
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-forest text-white hover:bg-forest/95",
    secondary: "border border-black/10 bg-white text-ink hover:bg-paper",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
  };

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${styles[variant]} ${className}`}
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin" size={16} /> : null}
      {pending ? pendingText : children}
    </button>
  );
}

export function WorkingText({
  active,
  messages = ["Getting started", "Reading approved memory", "Checking employee context", "Drafting response", "Almost there"]
}: {
  active: boolean;
  messages?: string[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, 1600);

    return () => window.clearInterval(timer);
  }, [active, messages.length]);

  if (!active) {
    return null;
  }

  return (
    <div className="rounded-md border border-forest/15 bg-forest/5 px-3 py-3 text-sm text-forest">
      <div className="flex items-center gap-2 font-semibold">
        <Loader2 className="animate-spin" size={16} />
        {messages[index]}
      </div>
      <p className="mt-1 text-xs text-graphite">Your AI employee is working inside the approved company scope.</p>
    </div>
  );
}

export function SuccessPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">
      <CheckCircle2 size={13} />
      {children}
    </span>
  );
}
