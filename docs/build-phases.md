# Build Phases

## Phase 1: Foundation

- Project skeleton
- Local database
- Company/workspace model
- Users and roles
- Onboarding packages
- Subscription records
- AI employee catalog
- Company AI employee instances
- Kipekee Studio workspace
- First dashboard

## Phase 2: Hermes Bridge

- Keep existing Hermes profiles untouched
- Add Kipekee-specific profile mapping
- Build a scoped task adapter
- Capture responses and errors
- Store session output in Kipekee

## Phase 3: Artifacts and Memory

When a user uploads a file:

1. Store it under the company workspace.
2. Create an artifact record.
3. Extract text and metadata.
4. Ask whether to add it to memory.
5. Ask which AI employees can access it.
6. Index memory only for selected employees.
7. Record all actions in the audit log.

## Phase 4: Sessions

- Separate sessions per AI employee
- Pinned sessions
- Archived sessions
- Session summaries
- Artifact attachments

## Phase 5: Loops

- Daily CEO brief
- Weekly marketing plan
- Proposal follow-up scan
- Finance reminders
- Lead research
- Content calendar
- Client support triage

## Phase 6: Approvals

Human approval is required before sensitive or external actions:

- Sending messages
- Publishing content
- Deleting files
- Inviting users
- Changing billing
- Connecting integrations
- Executing business-critical workflows

## Phase 7: Client Onboarding

- Create company
- Select package
- Choose AI employees
- Invite users
- Upload documents
- Assign employee access
- Activate subscription

## Phase 8: Billing and Usage

- KES 4,500 per user/month
- Setup package tracking
- Usage logs
- Invoice-ready records
- Plan limits
