# KIPEKEENETWORKS

Kipekee Networks is the AI workforce platform for Kipekee Studio. Customers use AI employees inside company-scoped workspaces while Hermes runs behind the scenes as the execution worker.

## Production Architecture

```text
Client browser
  -> Render web app
  -> Supabase Postgres
  -> HermesJob queue
  -> Local laptop or VPS Hermes worker
  -> Supabase Postgres
  -> Client sees the response in Kipekee Networks
```

Render does not need Hermes installed. It creates jobs in Supabase. Your laptop or future VPS runs `npm run worker:hermes` and writes responses back.

## Environment Variables

Use the Supabase pooler URL for app runtime:

```env
DATABASE_URL="postgresql://postgres.cfrgznfjspowdomzjfsc:[YOUR-PASSWORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

Use the direct Supabase URL for Prisma migrations:

```env
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.cfrgznfjspowdomzjfsc.supabase.co:5432/postgres"
```

Set these on Render:

```env
KIPEKEE_HERMES_MODE="profile"
KIPEKEE_HERMES_EXECUTION_MODE="queue"
KIPEKEE_SHARED_HERMES_PROFILE="kipekeenetworksworker"
NEXT_PUBLIC_APP_URL="https://your-render-app.onrender.com"
KIPEKEE_APP_URL="https://your-render-app.onrender.com"
KIPEKEE_STORAGE_PROVIDER="local"
```

Set these on the laptop/VPS worker:

```env
DATABASE_URL="same Supabase pooler URL"
DIRECT_URL="same Supabase direct URL"
HERMES_BIN="/Users/djsean/.local/bin/hermes"
KIPEKEE_HERMES_MODE="profile"
KIPEKEE_SHARED_HERMES_PROFILE="kipekeenetworksworker"
KIPEKEE_WORKER_ID="local-hermes-worker"
KIPEKEE_WORKER_POLL_MS="3000"
```

## Commands

```bash
npm install
npm run prisma:generate
npm run build
```

Push schema to Supabase:

```bash
npm run prisma:push
npm run seed
```

Run locally:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
npm run worker:hermes
```

## File Storage

Production should not rely on Render disk or laptop files for client documents. Use object storage:

- Supabase Storage: simplest because it lives beside Supabase Auth/Postgres.
- Uploadcare: good upload UX and general file handling.
- Cloudinary: best for image/video transformations.

The current code blocks local file uploads in production until object storage is connected.
