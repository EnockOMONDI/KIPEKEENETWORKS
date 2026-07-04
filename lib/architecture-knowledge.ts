export type ArchitectureStatus = "Complete" | "Partial" | "Foundation" | "Pending" | "Risk";

export type KnowledgeItem = {
  title: string;
  status: ArchitectureStatus;
  completion: number;
  summary: string;
  evidence: string[];
  risks: string[];
  next: string[];
};

export const architectureSummary = {
  maturity: "MVP operational, production hardening in progress",
  completion: 72,
  philosophy:
    "Kipekee Networks presents AI employees to customers while Hermes remains hidden orchestration infrastructure. The platform keeps workspace, organisation, runtime, employee, knowledge, and permission boundaries explicit.",
  sourceOfTruth:
    "This page is generated from current source-code inspection, not from old planning documents. Where runtime code is missing, the status is marked Foundation or Pending."
};

export const systemArchitecture = [
  {
    name: "Internet and Browser",
    summary: "Users access the Next.js app through browser routes and server actions.",
    files: ["app/layout.tsx", "app/page.tsx", "components/AppShell.tsx"]
  },
  {
    name: "Authentication",
    summary: "Email/password login creates an httpOnly session cookie backed by AuthSession records.",
    files: ["lib/auth.ts", "lib/security.ts", "lib/actions.ts"]
  },
  {
    name: "Workspace and Organisation Routing",
    summary: "currentUser resolves active workspace and organisation from cookies, falling back to the first active membership and company.",
    files: ["lib/auth.ts", "prisma/schema.prisma"]
  },
  {
    name: "Server Actions and API Routes",
    summary: "Server-side actions enforce same-origin, role checks, rate limits, and tenant-scoped Prisma queries.",
    files: ["lib/actions.ts", "app/api/loops/run/route.ts", "app/api/health/route.ts"]
  },
  {
    name: "Hermes Job Queue",
    summary: "Chat and work-instruction runs create signed HermesJob rows. The external worker claims jobs and writes assistant messages.",
    files: ["lib/actions.ts", "scripts/hermes-worker.ts", "lib/hermes-job-signing.ts"]
  },
  {
    name: "Company Runtime",
    summary: "Each organisation has one CompanyRuntime with a Hermes profile. Employees are roles that use the organisation runtime.",
    files: ["prisma/schema.prisma", "lib/company-runtime-provisioning.ts", "lib/hermes.ts"]
  },
  {
    name: "Skills and Work Instructions",
    summary: "Skills are reusable platform records; company work instructions are stored internally as Workflow/WorkflowStep records.",
    files: ["lib/seed-data.ts", "prisma/seed.ts", "app/workflows/page.tsx"]
  },
  {
    name: "Knowledge and Storage",
    summary: "Uploaded artifacts are scoped to workspace or company, optionally indexed into memory and assigned to employees.",
    files: ["lib/actions.ts", "lib/storage.ts", "lib/memory-context.ts", "app/artifacts/page.tsx", "app/documents/page.tsx"]
  },
  {
    name: "Connectors and Mailboxes",
    summary: "Integration and mailbox schema plus request UI exist. Real OAuth/API connector execution is not implemented yet.",
    files: ["app/integrations/page.tsx", "app/mailboxes/page.tsx", "prisma/schema.prisma"]
  },
  {
    name: "Response and Audit",
    summary: "Hermes worker validates jobs, runs Hermes, creates assistant messages, updates job status, and writes audit logs.",
    files: ["scripts/hermes-worker.ts", "lib/hermes.ts", "prisma/schema.prisma"]
  }
];

export const requestLifecycle = [
  {
    name: "Browser form submit",
    input: "employeeId, prompt, optional sessionId, optional workflowId",
    output: "Server action call",
    security: "Same-origin validation in assertSameOrigin.",
    failures: "Missing prompt or employee redirects to /chat.",
    files: ["components/ChatComposer.tsx", "lib/actions.ts"]
  },
  {
    name: "Authentication and context",
    input: "kipekee_session cookie plus optional workspace/company cookies",
    output: "Current user, workspace, company, member role",
    security: "Session token is hashed in DB; cookie is httpOnly and secure in production.",
    failures: "Unauthenticated users redirect to /login.",
    files: ["lib/auth.ts"]
  },
  {
    name: "Rate limit",
    input: "action, company, user, employee, request IP",
    output: "Allowed request or RateLimitError",
    security: "RateLimitBucket stores hashed keys and reset windows.",
    failures: "Redirects with error=rate-limit.",
    files: ["lib/rate-limit.ts", "lib/actions.ts"]
  },
  {
    name: "Employee and work instruction authorization",
    input: "requested employeeId and workflowId",
    output: "Employee with enabled skills and permitted workflow",
    security: "Employee must belong to current company; workflow must be assigned to the employee.",
    failures: "Invalid workflow redirects to /chat?error=workflow.",
    files: ["lib/actions.ts"]
  },
  {
    name: "Memory retrieval",
    input: "employee artifact access",
    output: "Untrusted approved-memory context",
    security: "Only artifacts scoped to current company or shared workspace and granted to the employee are included.",
    failures: "No files means empty memory context, not cross-company fallback.",
    files: ["lib/actions.ts", "lib/memory-context.ts"]
  },
  {
    name: "Signed job creation",
    input: "workspace, company, runtime, employee, session, skills, artifacts, prompt",
    output: "PENDING HermesJob with HMAC signature",
    security: "KIPEKEE_JOB_SIGNING_SECRET required in production/profile mode.",
    failures: "Missing signing secret throws before queueing.",
    files: ["lib/hermes-job-signing.ts", "lib/actions.ts"]
  },
  {
    name: "Worker claim and validation",
    input: "PENDING HermesJob",
    output: "RUNNING job or rejected failed job",
    security: "Worker re-checks signature, company runtime, employee, session, skills, workflow, and artifact access.",
    failures: "Invalid signature or unauthorized scope fails the job and writes an audit log.",
    files: ["scripts/hermes-worker.ts"]
  },
  {
    name: "Prompt composition and Hermes execution",
    input: "Company context, employee role, skills, work instruction, memory, brand voice, rules",
    output: "Assistant response",
    security: "Prompt forbids infrastructure leaks and treats documents as untrusted reference material.",
    failures: "Hermes errors return a safe client message and log server-side error details.",
    files: ["lib/hermes.ts"]
  },
  {
    name: "Persistence and browser refresh",
    input: "Hermes output",
    output: "assistant Message, COMPLETED HermesJob, AuditLog",
    security: "Writes remain scoped to the original session/company/job.",
    failures: "Worker marks jobs FAILED when exceptions occur.",
    files: ["scripts/hermes-worker.ts", "app/chat/page.tsx", "components/ChatAutoRefresh.tsx"]
  }
];

export const runtimeComponents: KnowledgeItem[] = [
  {
    title: "CompanyRuntime",
    status: "Complete",
    completion: 90,
    summary: "One runtime/profile record per organisation is enforced by CompanyRuntime.companyId unique.",
    evidence: ["prisma/schema.prisma", "lib/actions.ts", "lib/company-runtime-provisioning.ts"],
    risks: ["Profile provisioning can be deferred when local Hermes files cannot be written."],
    next: ["Expose clearer admin remediation when a runtime is pending."]
  },
  {
    title: "Prompt Builder",
    status: "Complete",
    completion: 85,
    summary: "Prompt includes organisation context, employee role, skills, company work instruction, brand voice, business rules, approved memory, and user request.",
    evidence: ["lib/hermes.ts"],
    risks: ["Responses are sanitized after execution, but advanced prompt-injection testing should continue."],
    next: ["Add automated tests for forbidden output sanitization."]
  },
  {
    title: "Hermes Worker",
    status: "Complete",
    completion: 88,
    summary: "Worker polls jobs, locks them, validates scope, executes Hermes, writes messages, and records heartbeat.",
    evidence: ["scripts/hermes-worker.ts", "prisma/schema.prisma"],
    risks: ["Only one worker pattern is implemented; no dedicated managed worker service on Render free tier."],
    next: ["Add deployment guide for local/VPS worker supervision."]
  },
  {
    title: "Model Selection",
    status: "Pending",
    completion: 10,
    summary: "No code-level model router exists yet. Hermes CLI/provider behavior is external to this app.",
    evidence: ["lib/hermes.ts"],
    risks: ["Cannot audit provider routing or token usage from this app yet."],
    next: ["Add explicit model/provider metadata once provider routing is implemented."]
  },
  {
    title: "Streaming",
    status: "Pending",
    completion: 0,
    summary: "Current chat is job-queue plus auto-refresh; no token streaming endpoint exists.",
    evidence: ["app/chat/page.tsx", "components/ChatAutoRefresh.tsx", "scripts/hermes-worker.ts"],
    risks: ["Users wait for full worker completion before seeing a response."],
    next: ["Add streaming only after queue reliability and worker deployment are stable."]
  }
];

export const dataArchitecture: KnowledgeItem[] = [
  {
    title: "Identity and tenancy",
    status: "Complete",
    completion: 90,
    summary: "User, Workspace, WorkspaceMember, Company, CompanyRuntime, AuthSession, and TeamInvite define tenancy and login boundaries.",
    evidence: ["prisma/schema.prisma", "lib/auth.ts", "app/invite/[token]/page.tsx"],
    risks: ["Company switching UI is basic; current company falls back to first company when no cookie is set."],
    next: ["Add explicit workspace/company switch action and audit it."]
  },
  {
    title: "AI workforce",
    status: "Complete",
    completion: 85,
    summary: "EmployeeTemplate, CompanyEmployee, Skill, EmployeeSkill, Workflow, WorkflowStep, and EmployeeWorkflow model reusable skills and organisation-specific work instructions.",
    evidence: ["prisma/schema.prisma", "lib/seed-data.ts", "app/employees/page.tsx", "app/workflows/page.tsx"],
    risks: ["Workflow is still the internal table name while UI says work instructions; this is acceptable but should be documented for developers."],
    next: ["Add versioning for edited work instructions."]
  },
  {
    title: "Knowledge and files",
    status: "Partial",
    completion: 70,
    summary: "KnowledgeCollection, Artifact, KnowledgeChunk, and ArtifactAccess support scoped uploads and simple text memory.",
    evidence: ["prisma/schema.prisma", "lib/actions.ts", "lib/storage.ts", "lib/memory-context.ts"],
    risks: ["No vector DB/search runtime yet; binary document text extraction is limited."],
    next: ["Add proper extraction/indexing pipeline and vector search after MVP validation."]
  },
  {
    title: "Jobs and observability",
    status: "Complete",
    completion: 82,
    summary: "HermesJob, WorkerHeartbeat, AuditLog, ApprovalRequest, Session, and Message support queue execution and admin visibility.",
    evidence: ["prisma/schema.prisma", "scripts/hermes-worker.ts", "app/systems/page.tsx"],
    risks: ["Audit logs are present but not yet exposed as a searchable full audit trail."],
    next: ["Add audit log browser with filters by workspace, organisation, actor, and action."]
  },
  {
    title: "Billing",
    status: "Foundation",
    completion: 45,
    summary: "Subscription, OnboardingPackage, and Invoice records exist with manual invoice creation.",
    evidence: ["prisma/schema.prisma", "app/billing/page.tsx", "lib/actions.ts"],
    risks: ["No payment processor, receipt flow, invoice PDF, or payment reconciliation yet."],
    next: ["Integrate payment provider after paid-client onboarding flow stabilizes."]
  },
  {
    title: "Integrations and email",
    status: "Foundation",
    completion: 35,
    summary: "IntegrationConnection, IntegrationAccess, Mailbox, MailboxAccess, EmailMessage, and EmailDraft exist as permission foundation.",
    evidence: ["prisma/schema.prisma", "app/integrations/page.tsx", "app/mailboxes/page.tsx"],
    risks: ["Real OAuth, sync, retries, webhooks, and connector execution are not implemented."],
    next: ["Build one connector end-to-end before adding additional providers."]
  }
];

export const integrationStatus: KnowledgeItem[] = [
  {
    title: "Supabase database and storage",
    status: "Partial",
    completion: 75,
    summary: "Postgres is used through Prisma. Supabase Storage uploads are supported when env vars are configured.",
    evidence: ["prisma/schema.prisma", "lib/db.ts", "lib/storage.ts", "app/api/health/route.ts"],
    risks: ["Storage bucket policies must be configured outside this repo."],
    next: ["Verify bucket privacy and service-role env vars in Render."]
  },
  {
    title: "Gmail / Google Workspace Mail",
    status: "Foundation",
    completion: 25,
    summary: "UI and schema can request planned mail connections and mailbox permissions. Real OAuth/mail sync is not present.",
    evidence: ["app/integrations/page.tsx", "app/mailboxes/page.tsx", "prisma/schema.prisma"],
    risks: ["No refresh tokens, scopes, API calls, retry logic, or message ingestion yet."],
    next: ["Implement OAuth, mailbox sync, read/draft permissions, and approval-only send flow."]
  },
  {
    title: "Google Drive",
    status: "Foundation",
    completion: 20,
    summary: "Drive appears in the planned integration catalog only.",
    evidence: ["app/integrations/page.tsx"],
    risks: ["No folder picker, file permissions, download, search, or indexing connector yet."],
    next: ["Implement Drive as a document intake connector after upload indexing is mature."]
  },
  {
    title: "WhatsApp Business",
    status: "Foundation",
    completion: 20,
    summary: "WhatsApp appears in the planned integration catalog only.",
    evidence: ["app/integrations/page.tsx"],
    risks: ["No webhook verification, session isolation, phone number mapping, or send approval runtime yet."],
    next: ["Build gateway pattern with per-channel and per-user session isolation."]
  },
  {
    title: "Outlook / Microsoft",
    status: "Foundation",
    completion: 20,
    summary: "Outlook appears in the planned integration catalog only.",
    evidence: ["app/integrations/page.tsx"],
    risks: ["No Microsoft OAuth or Graph API integration yet."],
    next: ["Delay until Gmail path proves the mailbox model."]
  },
  {
    title: "Stripe / payments",
    status: "Pending",
    completion: 0,
    summary: "Billing records exist, but no Stripe integration appears in code.",
    evidence: ["app/billing/page.tsx", "prisma/schema.prisma", "package.json"],
    risks: ["Manual billing only."],
    next: ["Add payment provider when pricing and invoice flow are final."]
  }
];

export const securityControls: KnowledgeItem[] = [
  {
    title: "Authentication and cookies",
    status: "Complete",
    completion: 85,
    summary: "Login stores hashed session tokens in AuthSession and sets httpOnly cookies.",
    evidence: ["lib/auth.ts", "lib/security.ts"],
    risks: ["No password reset or MFA in code yet."],
    next: ["Add password reset and optional MFA before larger public rollout."]
  },
  {
    title: "Authorization and RBAC",
    status: "Partial",
    completion: 75,
    summary: "Kipekee admin, client owner/admin/member roles gate pages and actions.",
    evidence: ["lib/roles.ts", "components/AppShell.tsx", "lib/actions.ts"],
    risks: ["Permission inheritance is simple; no per-feature custom policy engine yet."],
    next: ["Add explicit permission matrix tests for every action."]
  },
  {
    title: "Request hardening",
    status: "Complete",
    completion: 82,
    summary: "Server actions call same-origin validation and rate limits for sensitive operations.",
    evidence: ["lib/request-security.ts", "lib/rate-limit.ts", "lib/actions.ts", "tests/security/rate-limit.test.ts"],
    risks: ["CSRF relies on same-origin validation; no separate CSRF token currently exists."],
    next: ["Add CSRF token if cross-origin deployment complexity increases."]
  },
  {
    title: "Tenant isolation",
    status: "Complete",
    completion: 85,
    summary: "Queries are scoped by workspaceId/companyId in pages/actions and rechecked in the worker before Hermes execution.",
    evidence: ["lib/actions.ts", "scripts/hermes-worker.ts", "tests/security/isolation.test.ts"],
    risks: ["Every new feature must repeat server-side scoping; frontend role checks are UX only."],
    next: ["Add static tests for route/action scoping patterns."]
  },
  {
    title: "Hermes isolation",
    status: "Partial",
    completion: 78,
    summary: "Company runtime profiles are hardened and audited; worker uses neutral runtime dir and restricted prompt policy.",
    evidence: ["lib/hermes.ts", "lib/hermes-profile-security.ts", "scripts/audit-hermes-profiles.ts", "tests/security/hermes-profile-security.test.ts"],
    risks: ["Hermes CLI behavior is external; local filesystem isolation depends on profile hardening and runtime environment."],
    next: ["Run the worker from a dedicated OS user/container on VPS when moving beyond laptop execution."]
  },
  {
    title: "Secrets and storage",
    status: "Partial",
    completion: 80,
    summary: "Production local storage is blocked; Supabase service role is server-only; health endpoint reports env presence only.",
    evidence: ["lib/storage.ts", "app/api/health/route.ts", "lib/health-diagnostics.ts", "tests/security/frontend-boundary.test.ts"],
    risks: ["Real bucket policies and Render env rotation are external operational controls."],
    next: ["Document env rotation and bucket verification checklist inside private ops docs."]
  }
];

export const platformAudit: KnowledgeItem[] = [
  {
    title: "Authentication",
    status: "Complete",
    completion: 85,
    summary: "Functional email/password auth with hashed sessions.",
    evidence: ["lib/auth.ts"],
    risks: ["No MFA/password reset."],
    next: ["Add recovery flow."]
  },
  {
    title: "RBAC",
    status: "Partial",
    completion: 75,
    summary: "Role helpers protect pages/actions.",
    evidence: ["lib/roles.ts", "lib/actions.ts"],
    risks: ["No fine-grained custom permissions."],
    next: ["Add permission matrix."]
  },
  {
    title: "Database",
    status: "Complete",
    completion: 88,
    summary: "Prisma schema covers core MVP architecture.",
    evidence: ["prisma/schema.prisma"],
    risks: ["Some indexes may need tuning after production usage."],
    next: ["Add query tracing before scale."]
  },
  {
    title: "API and actions",
    status: "Partial",
    completion: 80,
    summary: "Server actions and limited API routes are implemented.",
    evidence: ["lib/actions.ts", "app/api/health/route.ts", "app/api/loops/run/route.ts"],
    risks: ["No public API versioning."],
    next: ["Keep internal-only until external API is needed."]
  },
  {
    title: "AI runtime",
    status: "Partial",
    completion: 78,
    summary: "Signed DB queue plus local/VPS Hermes worker is implemented.",
    evidence: ["scripts/hermes-worker.ts", "lib/hermes.ts"],
    risks: ["Worker must be running for production responses."],
    next: ["Move worker to supervised VPS process."]
  },
  {
    title: "Connectors",
    status: "Foundation",
    completion: 30,
    summary: "Connector schema/UI exists; real provider runtimes are pending.",
    evidence: ["app/integrations/page.tsx", "prisma/schema.prisma"],
    risks: ["No actual external sync/send behavior."],
    next: ["Implement one connector end-to-end."]
  },
  {
    title: "UI",
    status: "Partial",
    completion: 78,
    summary: "Main MVP pages exist with responsive app shell.",
    evidence: ["app/*.tsx", "components/AppShell.tsx", "components/ChatComposer.tsx"],
    risks: ["Some interactions are still basic CRUD/request flows."],
    next: ["Finish UI polish after backend/runtime stabilizes."]
  },
  {
    title: "Tests",
    status: "Partial",
    completion: 45,
    summary: "Security unit tests exist; route/e2e/mobile coverage is limited.",
    evidence: ["tests/security/*.test.ts", "package.json"],
    risks: ["No Playwright coverage for full client onboarding/chat journeys."],
    next: ["Add e2e smoke tests for login, onboarding, chat, upload, and invite."]
  },
  {
    title: "Billing",
    status: "Foundation",
    completion: 35,
    summary: "Subscriptions and invoices are recorded manually.",
    evidence: ["app/billing/page.tsx", "prisma/schema.prisma"],
    risks: ["No payment processor or automatic invoice status update."],
    next: ["Add payment flow later."]
  }
];

export const recommendations = [
  {
    priority: "High",
    items: [
      "Deploy Hermes worker as a supervised VPS/local service before relying on production chat.",
      "Add end-to-end tests for invite acceptance, login, chat queueing, worker completion, and document upload.",
      "Add audit-log browser so production incidents can be traced by workspace, organisation, actor, and action."
    ]
  },
  {
    priority: "Medium",
    items: [
      "Add query tracing and slow-query monitoring once real clients generate data.",
      "Implement one connector end-to-end before expanding the connector catalog.",
      "Add versioning for company work instructions and employee role instructions."
    ]
  },
  {
    priority: "Low",
    items: [
      "Rename developer-facing workflow concepts in code only if it becomes a maintenance problem.",
      "Add richer mobile interaction tests after UI polish.",
      "Add cost/token tracking once model/provider routing is explicit."
    ]
  }
];
