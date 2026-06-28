# Deployment Notes

Kipekee Networks can build locally with:

```bash
npm run build
```

## Required Production Inputs

- Production database URL, preferably PostgreSQL.
- `HERMES_BIN` path or remote Hermes worker API.
- Production secrets for auth/session handling.
- Storage provider for uploaded artifacts.
- Domain and HTTPS.
- Billing/payment provider details.
- Background worker or scheduler for active loops.

## Current Local Mode

The app currently uses:

- Next.js
- Local SQLite
- Local file uploads under `uploads/`
- Local Hermes CLI execution

This is suitable for dogfooding on your machine, not production hosting yet.

## Recommended Production Shape

```text
Kipekee Networks Web
  -> PostgreSQL
  -> Object storage
  -> Background worker
  -> Hermes worker pool
  -> Billing provider
```

Small clients can share the worker pool with strict tenant scoping.

Higher-risk clients can receive a separate Hermes home/profile/container.

Enterprise clients should receive isolated infrastructure if paid.
