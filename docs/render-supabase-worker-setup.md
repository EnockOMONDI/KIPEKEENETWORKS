# Render + Supabase + Hermes Worker Setup

This is the target MVP deployment flow:

```text
Client browser
  -> Render web app
  -> Supabase Postgres
  -> HermesJob queue
  -> Hermes worker on laptop or Oracle VPS
  -> Supabase response
  -> Client sees answer in Kipekee Networks
```

Render does not need Hermes installed in this setup. Render writes jobs into Supabase. A separate worker runs Hermes and writes the answer back.

## Execution Modes

Local direct mode:

```env
KIPEKEE_HERMES_EXECUTION_MODE="direct"
```

Use this when running the app on the same machine as Hermes.

Hosted queue mode:

```env
KIPEKEE_HERMES_EXECUTION_MODE="queue"
```

Use this on Render. The web app creates `HermesJob` rows instead of calling the Hermes binary.

## Render Environment Variables

Set these in Render:

```env
DATABASE_URL="postgresql://..."
KIPEKEE_HERMES_MODE="profile"
KIPEKEE_HERMES_EXECUTION_MODE="queue"
KIPEKEE_SHARED_HERMES_PROFILE="kipekeenetworksworker"
```

Do not set `HERMES_BIN` on Render for queue mode. Render is not running Hermes.

## Worker Environment Variables

Set these on your laptop or Oracle VPS:

```env
DATABASE_URL="postgresql://..."
HERMES_BIN="/Users/djsean/.local/bin/hermes"
KIPEKEE_HERMES_MODE="profile"
KIPEKEE_HERMES_EXECUTION_MODE="direct"
KIPEKEE_SHARED_HERMES_PROFILE="kipekeenetworksworker"
KIPEKEE_WORKER_ID="oracle-hermes-worker-1"
KIPEKEE_WORKER_POLL_MS="3000"
```

For Oracle Linux, `HERMES_BIN` will be different after Hermes is installed there.

## Render Build Settings

Build command:

```bash
npm install && npm run prisma:generate && npm run build
```

Start command:

```bash
npm run start
```

Render provides `PORT`; Next.js `next start` will use it.

## Supabase Setup

1. Create a Supabase project.
2. Copy the pooled or direct database connection string.
3. Put that connection string in `DATABASE_URL`.
4. Run the schema setup from your local machine:

```bash
DATABASE_URL="postgresql://..." npm run prisma:push
DATABASE_URL="postgresql://..." npm run seed
```

For the current MVP, this creates the app tables and seed data.

Later, enable `pgvector` and add memory chunk/embedding tables for real vector memory.

## Running The Worker Locally

From your laptop:

```bash
cd /Users/djsean/Documents/Codex/2026-06-28/h/kipekee-networks
DATABASE_URL="postgresql://..." npm run worker:hermes
```

Run one job and exit:

```bash
DATABASE_URL="postgresql://..." npm run worker:hermes:once
```

## Oracle VPS Worker

On Oracle VPS:

```bash
git clone <repo-url>
cd kipekee-networks
npm install
npm run prisma:generate
npm run hermes:provision
npm run worker:hermes
```

For 24/7 operation, run the worker under `systemd`, `pm2`, or another process manager.

## Chat Behavior In Queue Mode

When a user chats:

```text
1. Web app creates Session.
2. Web app stores user Message.
3. Web app creates HermesJob with status PENDING.
4. Web app stores placeholder assistant Message.
5. Worker claims job and marks it RUNNING.
6. Worker calls Hermes.
7. Worker stores final assistant Message.
8. Worker marks job COMPLETED.
```

Current UI will show the placeholder immediately. A later improvement should replace this with live polling so users see `PENDING`, `RUNNING`, `COMPLETED`, and `FAILED` states without refreshing.

## Practical Rollout

```text
Step 1:
  Prepare repo with queue mode. Done.

Step 2:
  Create Supabase project and get DATABASE_URL.

Step 3:
  Push schema and seed data to Supabase.

Step 4:
  Deploy web app on Render with queue mode.

Step 5:
  Run laptop worker using the same Supabase DATABASE_URL.

Step 6:
  Test client login and chat.

Step 7:
  Move worker to Oracle VPS.
```
