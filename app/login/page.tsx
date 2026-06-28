import { loginAction } from "@/lib/actions";
import { SubmitButton } from "@/components/Interactive";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5">
      <section className="w-full max-w-md rounded-lg border border-black/10 bg-white p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-copper">
          Kipekee Networks
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-graphite">
          Local Phase 1 login for the Kipekee Studio workspace.
        </p>
        {params.error ? (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Invalid email or password.
          </div>
        ) : null}
        {params.invite === "accepted" ? (
          <div className="mt-4 rounded-md bg-forest/10 px-3 py-2 text-sm text-forest">
            Account created. Sign in with your email and new password.
          </div>
        ) : null}
        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-2 w-full rounded-md border border-black/10 px-3 py-2"
              placeholder="founder@kipekee.studio"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-2 w-full rounded-md border border-black/10 px-3 py-2"
              name="password"
              required
              type="password"
            />
          </label>
          <SubmitButton className="w-full" pendingText="Signing in">
            Sign in
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
