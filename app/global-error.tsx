"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global route error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-[#fbf8ff] px-5 font-sans text-[#111827]">
          <section className="w-full max-w-lg rounded-3xl border border-[#e9d5ff] bg-white p-6 shadow-[0_18px_45px_rgba(17,24,39,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c2410c]">Kipekee Networks</p>
            <h1 className="mt-3 text-3xl font-semibold">We hit a small bump</h1>
            <p className="mt-3 text-sm leading-6 text-[#5f6573]">
              The workspace is still protected. Refresh this screen or try again in a moment.
            </p>
            {error.digest ? (
              <p className="mt-4 rounded-2xl bg-[#fbf8ff] px-3 py-2 text-xs text-[#5f6573]">
                Support code: {error.digest}
              </p>
            ) : null}
            <button
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => reset()}
              type="button"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
