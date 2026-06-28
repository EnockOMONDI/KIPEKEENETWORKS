# Hosted Client Rollout Plan

Kipekee Networks is the client-facing product. Hermes remains hidden infrastructure.

This document explains how to let real clients access the web app remotely while Hermes still runs from a controlled worker, including the temporary laptop-worker setup and the better production path.

## Recommended MVP Architecture

```text
Client Browser
   |
   v
Kipekee Networks Web App on Render
   |
   v
Supabase Postgres + Storage + pgvector
   |
   v
Job Queue table
   |
   v
Hermes Worker running on your laptop
   |
   v
Writes response back to Supabase
   |
   v
Client sees response in web app
```

The hosted web app should not directly call a public Hermes endpoint on your laptop. Instead, the web app writes pending jobs into Supabase. The Hermes worker on your laptop polls Supabase for jobs, executes them locally, then writes the answer back.

That keeps your laptop from needing an inbound public port.

## Hosting Rule

Render free can work for demos and pilots, but not for serious paying production.

Use this rollout:

```text
Internal dogfood:
  Local app + local Hermes + local SQLite

Demo client:
  Render free + Supabase free + Hermes worker on laptop

First paying client:
  Paid web hosting + Supabase Pro + temporary Hermes worker on laptop

Serious clients:
  Paid hosting + managed database + Hermes worker on VPS/cloud

Enterprise clients:
  Fully isolated deployment
```

## Client Isolation Rule

Start with one shared database and strict tenant scoping.

```text
Small/normal clients:
  One shared Supabase database
  Every table has companyId
  Every request is scoped by companyId

Higher-risk clients:
  Shared app/database if acceptable
  Separate Hermes profiles or separate Hermes home/container

Enterprise clients:
  Separate app deployment
  Separate database
  Separate storage
  Separate Hermes runtime
  Separate vector index
```

Do not start with one database per company unless a client pays for it. Separate databases increase operational work: migrations, analytics, support, billing, backups, and monitoring all become harder.

## Database Setup

For the MVP:

```text
Database: Supabase Postgres
Storage: Supabase Storage
Vector search: Supabase pgvector
Queue: Supabase table
```

Core tenant rule:

```text
Every table with client data must include companyId.
Every query must filter by companyId.
Every vector search must filter by companyId.
```

## Vector Memory Model

Use Supabase `pgvector` first. Do not add Pinecone, Qdrant, or Weaviate until scale requires it.

Recommended model:

```text
Company
  |
  v
Artifacts
  |
  v
Chunks
  |
  v
Embeddings
  |
  v
Vector search filtered by companyId + employee access
```

Tables:

```text
Artifact
- id
- companyId
- uploadedBy
- title
- filePath
- memoryStatus

ArtifactAccess
- artifactId
- employeeId
- canUseAsMemory

MemoryChunk
- id
- companyId
- artifactId
- content
- embedding
- metadata

AgentMemory
- id
- companyId
- employeeId
- content
- embedding
- metadata
```

Critical rule:

```text
The AI employee never searches all memory.
It searches only memory allowed for the current company and current employee.
```

Example:

```sql
WHERE company_id = current_company_id
AND employee_id = current_employee_id
```

or:

```sql
WHERE company_id = current_company_id
AND artifact_id IN approved_artifacts_for_employee
```

## Chat Flow

```text
1. User opens Kipekee Networks.
2. User selects an AI employee.
3. User sends a prompt.
4. Web app creates a chat message.
5. Web app creates a Hermes job in Supabase.
6. UI shows working states:
   - Getting started
   - Reading approved memory
   - Checking employee context
   - Drafting response
   - Almost there
7. Hermes worker polls Supabase.
8. Hermes worker finds pending job.
9. Worker loads company scope and employee permissions.
10. Worker searches approved vector memory.
11. Worker calls the right Hermes profile.
12. Worker writes the assistant response to Supabase.
13. Web app shows the response.
```

## Hermes Worker Flow

The laptop worker should run a loop:

```text
Every few seconds:
  Find pending jobs
  Lock one job
  Load company context
  Load employee profile/config
  Search approved memory
  Call Hermes
  Save response
  Mark job complete
```

Job table example:

```text
HermesJob
- id
- companyId
- employeeId
- sessionId
- prompt
- status: pending | running | completed | failed
- lockedAt
- lockedBy
- result
- error
- createdAt
- completedAt
```

This is better than exposing Hermes directly to the internet.

## Client Onboarding Flow

```text
1. Create company workspace.
2. Select package:
   - Personal Setup
   - Business Starter
   - Max Onboarding
   - Custom Workflow / Integration
3. Choose isolation tier:
   - Shared infrastructure
   - Separate Hermes profiles
   - Separate Hermes home/container
   - Fully isolated deployment
4. Create users.
5. Assign AI employees.
6. Upload company documents.
7. Choose which employees can access each document.
8. Index approved documents into memory.
9. Set up loops.
10. Connect integrations if needed.
11. Train client users.
```

## Integrations Flow

Clients should be able to connect services, but Kipekee controls the access boundary.

Priority order:

```text
1. Google Drive
2. Gmail / Outlook
3. WhatsApp Business
4. Calendar
5. CRM
```

Integration tables:

```text
CompanyIntegration
- id
- companyId
- provider
- status
- encryptedAccessToken
- encryptedRefreshToken
- scopes
- connectedBy
- createdAt
- updatedAt

EmployeeIntegrationAccess
- id
- employeeId
- integrationId
- canRead
- canDraft
- canSend
- requiresApproval
```

Safety rule:

```text
AI employees can draft external actions.
Humans approve before sending, updating, posting, or deleting.
```

Examples:

```text
WhatsApp:
  Customer Support drafts replies.
  Human approves before sending.

Gmail/Outlook:
  Proposal Writer drafts email responses.
  Human approves before sending.

Google Drive:
  Research Assistant searches approved folders.
  It cannot access unapproved folders.

Calendar:
  CEO Assistant suggests meeting slots.
  Human approves event creation.

CRM:
  Sales Assistant summarizes leads and drafts follow-ups.
  Updates require approval.
```

## Better Production Architecture

The laptop-worker setup is acceptable for demos and early pilots, but the proper production setup is:

```text
Kipekee Networks Web App
   |
   v
Postgres / Supabase
   |
   v
Supabase Storage
   |
   v
pgvector memory
   |
   v
Hermes Worker Service on VPS/cloud
   |
   v
Integrations
   |
   v
Approval inbox
```

Recommended production move:

```text
Move Hermes worker from laptop to a VPS or cloud worker once the first paying client is active.
```

## Final Recommendation

For the first real client:

```text
Web app:
  Render paid starter, Railway, Fly.io, or similar

Database:
  Supabase Postgres

Storage:
  Supabase Storage

Vector:
  Supabase pgvector

Hermes:
  Laptop worker temporarily

Queue:
  Supabase jobs table
```

Then, once the workflow is validated:

```text
Move Hermes worker to VPS/cloud.
Add real OAuth integrations.
Add production monitoring.
Add backups.
Add proper billing and invoices.
Add per-client deployment option for enterprise.
```

Do not promise enterprise-grade uptime while Hermes depends on a laptop. Use that only for a pilot or demo.
