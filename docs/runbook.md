# Kipekee Networks Local Runbook

Kipekee Networks is the customer-facing web app. Hermes is the hidden orchestration/runtime layer behind the AI employees.

## Run The Web App

```bash
cd /Users/djsean/Documents/Codex/2026-06-28/h/kipekee-networks
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000/login
```

Local founder login is created from seed environment variables:

```text
KIPEKEE_ADMIN_EMAIL
KIPEKEE_ADMIN_PASSWORD
```

Use `127.0.0.1` consistently instead of switching between `localhost` and `127.0.0.1`, because browser cookies are host-specific.

## Run Hermes

CLI profile test:

```bash
/Users/djsean/.local/bin/hermes --profile kipekeestudiomarketing -z "Confirm your Kipekee Studio role in one sentence."
```

Interactive Hermes CLI:

```bash
/Users/djsean/.local/bin/hermes --profile kipekeestudiomarketing
```

Hermes dashboard:

```bash
/Users/djsean/.local/bin/hermes dashboard --host 127.0.0.1 --port 9119 --no-open
```

Then open:

```text
http://127.0.0.1:9119
```

Hermes Desktop was built locally here:

```text
/Users/djsean/.hermes/hermes-agent/apps/desktop/release/mac-arm64/Hermes.app
```

Launch the existing build:

```bash
PATH="/Users/djsean/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" \
  /Users/djsean/.local/bin/hermes desktop --skip-build
```

The custom `PATH` uses the bundled Node 24 runtime. The Homebrew Node on this Mac is `20.18.3`, which is below Hermes Desktop's required Node version.

## Run Scheduled Loops

One-off local run:

```bash
cd /Users/djsean/Documents/Codex/2026-06-28/h/kipekee-networks
npm run loops:run
```

The current loop runner queues active loop jobs. The Hermes worker processes those jobs and writes responses back to the chat project.

## Add A New Company

1. Log in as `founder@kipekee.studio`.
2. Open `Client onboarding`.
3. Enter the company name.
4. Choose an onboarding package.
5. Click `Create workspace`.

The app will create:

- Company workspace.
- Subscription at KES 4,500 per user/month.
- Setup/onboarding fee from the selected package.
- Included AI employee instances.
- Draft setup invoice.
- Starter approval loop when the package includes loops.

Pick the isolation tier during onboarding:

- `Shared infrastructure`: normal clients. Employees use the neutral `kipekeenetworksworker` Hermes profile with strict tenant-scoped prompts and database permissions.
- `Separate Hermes profiles`: higher-risk clients. Employees get company-specific Hermes profile names. Run `npm run hermes:provision` after onboarding to create/update those profiles.
- `Separate Hermes home/container`: sensitive clients. The app stores a dedicated Hermes home path for that company. Container execution is the next runtime step and needs Docker or another process isolation layer.
- `Fully isolated deployment`: enterprise clients. The app marks the client for a separate deployment paid for by the client.

Kipekee Studio itself is configured as `Separate Hermes profiles` with namespace `kipekeestudio`.

Provision Hermes profiles:

```bash
cd /Users/djsean/Documents/Codex/2026-06-28/h/kipekee-networks
npm run hermes:provision
```

This creates the shared worker profile and any missing company-specific profiles for `Separate Hermes profiles` companies.

## How The Pieces Work

- Login creates an auth session and scopes all screens to the signed-in user's company.
- Employees are company-owned AI employee instances, not global shared workers.
- Artifacts are uploaded into a company folder and stored as records.
- When adding an artifact to memory, the user chooses which employees can access it.
- Chat sends the employee, company scope, allowed artifacts, and memory context to Hermes.
- Hermes returns the answer, and Kipekee stores the conversation.
- Loops call Hermes on a schedule or by `Run now`, then place outputs in the approval inbox.
- Billing tracks subscriptions and invoices separately from Hermes.
