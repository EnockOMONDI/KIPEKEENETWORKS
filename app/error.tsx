"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 text-ink">
      <section className="w-full max-w-lg rounded-3xl border border-violetline bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-copper">Kipekee Networks</p>
        <h1 className="mt-3 text-3xl font-semibold">We hit a small bump</h1>
        <p className="mt-3 text-sm leading-6 text-graphite">
          Your workspace is still safe. Try once more, or head back to the dashboard and continue from there.
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-2xl bg-paper px-3 py-2 text-xs text-graphite">
            Support code: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-forest px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => reset()}
            type="button"
          >
            Try again
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-violetline px-4 py-2.5 text-sm font-semibold text-ink"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
