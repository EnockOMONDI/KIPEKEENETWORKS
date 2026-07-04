export const onboardingPackages = [
  {
    name: "Personal Setup",
    priceKes: 5000,
    description: "4 AI employees, support, document memory",
    includedEmployees: 4,
    loops: false,
    documentMemory: true
  },
  {
    name: "Business Starter",
    priceKes: 15000,
    description: "8 AI employees, support, company work instructions, document memory",
    includedEmployees: 8,
    loops: true,
    documentMemory: true
  },
  {
    name: "Max Onboarding",
    priceKes: 50000,
    description: "Advanced setup, priority support, deeper work instruction setup",
    includedEmployees: 12,
    loops: true,
    documentMemory: true
  },
  {
    name: "Custom Work Instruction / Integration",
    priceKes: null,
    description: "CRM, WhatsApp, email, calendar, accounting, and custom automation",
    includedEmployees: null,
    loops: true,
    documentMemory: true
  }
];

export const skillCatalog = [
  {
    key: "business-briefing",
    name: "Business Briefing",
    category: "operations",
    description: "Summarizes priorities, risks, decisions, and next actions for owners, directors, and managers.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "company-onboarding",
    name: "Organisation Onboarding",
    category: "operations",
    description: "Turns uploaded documents, owner notes, services, policies, and FAQs into a working organisation setup.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "knowledge-structuring",
    name: "Knowledge Structuring",
    category: "knowledge",
    description: "Organizes uploaded files into summaries, FAQs, catalogues, policies, work instructions, and reusable memory sections.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "document-analysis",
    name: "Document Analysis",
    category: "knowledge",
    description: "Reads approved documents, extracts key facts, compares versions, and prepares concise business summaries.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "marketing-planning",
    name: "Marketing Planning",
    category: "marketing",
    description: "Creates campaigns, content calendars, positioning, offers, launch plans, and growth recommendations.",
    defaultToolsets: ["chat", "memory", "documents", "web", "audit"]
  },
  {
    key: "content-creation",
    name: "Content Creation",
    category: "marketing",
    description: "Drafts social posts, captions, newsletters, website copy, scripts, hooks, and campaign assets in the brand voice.",
    defaultToolsets: ["chat", "memory", "documents", "web", "audit"]
  },
  {
    key: "brand-management",
    name: "Brand Management",
    category: "brand",
    description: "Maintains brand voice, messaging consistency, creative direction, naming, tone, and offer positioning.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "proposal-writing",
    name: "Proposal Writing",
    category: "sales",
    description: "Drafts proposals, quotations, assumptions, exclusions, deliverables, timelines, and executive summaries.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "sales-follow-up",
    name: "Sales Follow-up",
    category: "sales",
    description: "Prepares lead follow-ups, deal notes, meeting recaps, objections, next steps, and approval-first sales messages.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "crm-support",
    name: "CRM Support",
    category: "sales",
    description: "Organizes customer records, lead notes, pipeline summaries, follow-up reminders, and CRM update drafts.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "customer-support",
    name: "Customer Support",
    category: "support",
    description: "Drafts responses, FAQs, triage notes, service recovery messages, escalation summaries, and follow-up actions.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "email-drafting",
    name: "Email Drafting",
    category: "communications",
    description: "Reads permitted mailbox context and drafts approval-first email replies, follow-ups, and internal updates.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "finance-support",
    name: "Finance Support",
    category: "finance",
    description: "Organizes invoices, payment reminders, budget notes, expense summaries, financial follow-ups, and approval tasks.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "operations-planning",
    name: "Operations Planning",
    category: "operations",
    description: "Creates work instructions, checklists, shift plans, delivery trackers, task breakdowns, and process improvement notes.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "procurement-support",
    name: "Procurement Support",
    category: "operations",
    description: "Compares suppliers, prepares RFQs, purchase notes, stock reminders, and approval-first procurement summaries.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "research",
    name: "Research",
    category: "research",
    description: "Finds, compares, and summarizes market, competitor, customer, supplier, industry, and policy information.",
    defaultToolsets: ["chat", "memory", "documents", "web", "audit"]
  },
  {
    key: "data-reporting",
    name: "Data & Reporting",
    category: "analytics",
    description: "Turns notes, tables, and business activity into reports, metrics, summaries, dashboards, and management updates.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "hr-support",
    name: "HR Support",
    category: "people",
    description: "Drafts role descriptions, interview notes, onboarding plans, staff reminders, and policy communication drafts.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "travel-planning",
    name: "Travel Planning",
    category: "travel",
    description: "Prepares itineraries, package outlines, supplier questions, visa notes, pricing assumptions, and client travel proposals.",
    defaultToolsets: ["chat", "memory", "documents", "web", "audit"]
  },
  {
    key: "grant-support",
    name: "Grant Support",
    category: "foundation",
    description: "Reviews grant opportunities, requirements, donor fit, budgets, impact language, and submission checklists.",
    defaultToolsets: ["chat", "memory", "documents", "web", "audit"]
  },
  {
    key: "education-admin",
    name: "Education Administration",
    category: "education",
    description: "Supports admissions, parent communication, programme information, school notices, and education operations drafts.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "software-planning",
    name: "Software Planning",
    category: "engineering",
    description: "Plans software tasks, specs, technical reports, product requirements, QA checklists, and delivery notes.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  }
];

export const employeeTemplates = [
  { name: "CEO Assistant", skills: ["business-briefing", "company-onboarding", "research", "email-drafting", "data-reporting"] },
  { name: "Creative Director", skills: ["brand-management", "marketing-planning", "content-creation"] },
  { name: "Marketing Manager", skills: ["marketing-planning", "content-creation", "research", "brand-management", "data-reporting"] },
  { name: "Proposal Writer", skills: ["proposal-writing", "document-analysis", "research", "sales-follow-up"] },
  { name: "Finance Assistant", skills: ["finance-support", "document-analysis", "email-drafting", "data-reporting"] },
  { name: "Software Engineer", skills: ["software-planning", "document-analysis", "research", "operations-planning"] },
  { name: "Brand Manager", skills: ["brand-management", "content-creation", "marketing-planning", "knowledge-structuring"] },
  { name: "Social Media Manager", skills: ["content-creation", "marketing-planning", "brand-management", "customer-support"] },
  { name: "Research Analyst", skills: ["research", "document-analysis", "business-briefing", "data-reporting"] },
  { name: "Customer Support", skills: ["customer-support", "email-drafting", "document-analysis", "crm-support"] },
  { name: "Sales Assistant", skills: ["proposal-writing", "sales-follow-up", "crm-support", "customer-support", "email-drafting"] },
  { name: "CRM Assistant", skills: ["crm-support", "sales-follow-up", "customer-support", "business-briefing"] },
  { name: "Operations Assistant", skills: ["operations-planning", "business-briefing", "procurement-support", "finance-support", "data-reporting"] },
  { name: "HR Assistant", skills: ["hr-support", "document-analysis", "email-drafting", "operations-planning"] },
  { name: "Travel Consultant", skills: ["travel-planning", "proposal-writing", "research", "customer-support", "email-drafting"] },
  { name: "Grant Assistant", skills: ["grant-support", "proposal-writing", "research", "finance-support", "document-analysis"] },
  { name: "Education Administrator", skills: ["education-admin", "customer-support", "email-drafting", "document-analysis", "operations-planning"] }
];

export const kipekeeStudioEmployees = [
  "CEO Assistant",
  "Creative Director",
  "Marketing Manager",
  "Proposal Writer",
  "Finance Assistant",
  "Software Engineer",
  "Brand Manager",
  "Social Media Manager",
  "Research Analyst",
  "Customer Support",
  "Sales Assistant"
];

export const organisationTypes = [
  { value: "COMPANY", label: "Company" },
  { value: "BRAND", label: "Brand" },
  { value: "FOUNDATION", label: "Foundation" },
  { value: "NGO", label: "NGO" },
  { value: "SCHOOL", label: "School" },
  { value: "DEPARTMENT", label: "Department" },
  { value: "PROGRAMME", label: "Programme" },
  { value: "BRANCH", label: "Branch" },
  { value: "CHURCH", label: "Church" },
  { value: "COUNTY_GOVERNMENT", label: "County Government" },
  { value: "UNIVERSITY", label: "University" },
  { value: "PROJECT", label: "Project" },
  { value: "OTHER", label: "Other" }
];

export function safeOrganisationType(value: string) {
  return organisationTypes.some((type) => type.value === value) ? value : "COMPANY";
}

export const workflowTemplateCatalog = [
  {
    key: "organisation-setup",
    name: "Organisation setup",
    category: "onboarding",
    description: "Turn owner notes and uploaded documents into a practical organisation profile, knowledge map, rules, and next setup tasks.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "CEO Assistant",
    steps: [
      {
        skillKey: "company-onboarding",
        instruction: "Review approved owner notes and uploaded files. Draft the organisation profile, services/products, contacts, policies, and missing information checklist.",
        requiresApproval: true
      },
      {
        skillKey: "knowledge-structuring",
        instruction: "Propose knowledge collections and document memory structure for this organisation.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "document-intake-summary",
    name: "Document intake summary",
    category: "knowledge",
    description: "Summarize newly uploaded files and recommend whether they should become memory and which employees should access them.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Research Analyst",
    steps: [
      {
        skillKey: "document-analysis",
        instruction: "Summarize uploaded documents, extract key facts, risks, definitions, and business rules.",
        requiresApproval: false
      },
      {
        skillKey: "knowledge-structuring",
        instruction: "Recommend memory collections, employee access, tags, and missing documents.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "weekly-marketing-plan",
    name: "Weekly marketing plan",
    category: "marketing",
    description: "Prepare a weekly marketing plan with campaign priorities, content ideas, offers, channels, and next actions.",
    triggerType: "SCHEDULED",
    schedule: "Every Monday 09:00 Africa/Nairobi",
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Marketing Manager",
    steps: [
      {
        skillKey: "marketing-planning",
        instruction: "Review approved organisation memory and draft this week's marketing plan with goals, offers, target audience, channels, and metrics.",
        requiresApproval: true
      },
      {
        skillKey: "content-creation",
        instruction: "Draft a short content calendar with captions or campaign copy in the approved brand voice.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "content-calendar",
    name: "Content calendar",
    category: "marketing",
    description: "Create a social/content calendar from campaigns, products, events, offers, and brand voice.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Social Media Manager",
    steps: [
      {
        skillKey: "brand-management",
        instruction: "Confirm tone, audience, campaign angle, and brand constraints from approved memory.",
        requiresApproval: false
      },
      {
        skillKey: "content-creation",
        instruction: "Draft platform-specific content ideas, captions, hooks, calls-to-action, and posting order.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "proposal-draft",
    name: "Proposal draft",
    category: "sales",
    description: "Draft a practical business proposal from approved organisation context and user requirements.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Proposal Writer",
    steps: [
      {
        skillKey: "document-analysis",
        instruction: "Review relevant approved files, products, pricing, prior proposals, and client requirements.",
        requiresApproval: false
      },
      {
        skillKey: "proposal-writing",
        instruction: "Create a proposal structure, executive summary, scope, assumptions, exclusions, deliverables, timeline, and next steps.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "sales-follow-up",
    name: "Sales follow-up",
    category: "sales",
    description: "Prepare follow-up messages, next-step tasks, and CRM notes after a lead, meeting, inquiry, or proposal.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Sales Assistant",
    steps: [
      {
        skillKey: "sales-follow-up",
        instruction: "Summarize the opportunity, client need, objections, next steps, and draft a professional follow-up message.",
        requiresApproval: true
      },
      {
        skillKey: "crm-support",
        instruction: "Prepare CRM update notes, pipeline status, and reminders without writing to external systems automatically.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "customer-support-triage",
    name: "Customer support triage",
    category: "support",
    description: "Review incoming customer issues, classify urgency, draft responses, and escalate sensitive cases.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Customer Support",
    steps: [
      {
        skillKey: "customer-support",
        instruction: "Summarize the issue, classify urgency, draft a helpful response, and list any escalation needed.",
        requiresApproval: true
      },
      {
        skillKey: "email-drafting",
        instruction: "Prepare an approval-first email reply when mailbox context is available.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "mailbox-triage-draft",
    name: "Mailbox triage and draft",
    category: "communications",
    description: "Review permitted mailbox context, classify messages, and draft replies for human approval.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Customer Support",
    steps: [
      {
        skillKey: "customer-support",
        instruction: "Classify message type, urgency, customer intent, and required internal context.",
        requiresApproval: false
      },
      {
        skillKey: "email-drafting",
        instruction: "Draft a response for approval. Do not send or imply that the message has been sent.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "invoice-review",
    name: "Invoice review",
    category: "finance",
    description: "Review invoice details, payment status, risks, and next actions before human approval.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Finance Assistant",
    steps: [
      {
        skillKey: "finance-support",
        instruction: "Check invoice details, summarize payment context, highlight risks, and prepare next actions.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "monthly-business-report",
    name: "Monthly business report",
    category: "operations",
    description: "Prepare a monthly owner report covering work completed, risks, opportunities, finances, customers, and next actions.",
    triggerType: "SCHEDULED",
    schedule: "First weekday of each month 09:00 Africa/Nairobi",
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "CEO Assistant",
    steps: [
      {
        skillKey: "business-briefing",
        instruction: "Summarize the month from approved memory, chats, uploaded notes, company work instructions, and tasks.",
        requiresApproval: false
      },
      {
        skillKey: "data-reporting",
        instruction: "Organize highlights, metrics, risks, open decisions, and recommended next actions into a report.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "sop-checklist",
    name: "Work instruction and checklist builder",
    category: "operations",
    description: "Turn process notes into company work instructions, checklists, responsibilities, approvals, and repeatable steps.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Operations Assistant",
    steps: [
      {
        skillKey: "operations-planning",
        instruction: "Draft a company work instruction with objective, trigger, owner, steps, checklist, risks, approvals, and handoff notes.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "procurement-comparison",
    name: "Procurement comparison",
    category: "operations",
    description: "Compare suppliers, quotes, stock needs, delivery constraints, risks, and recommended purchase actions.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Operations Assistant",
    steps: [
      {
        skillKey: "procurement-support",
        instruction: "Compare suppliers or purchase options using approved context. Prepare recommendation, questions, and approval notes.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "grant-application-review",
    name: "Grant application review",
    category: "foundation",
    description: "Review grant opportunity fit, requirements, deadlines, documents, and approval-ready next steps.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Grant Assistant",
    steps: [
      {
        skillKey: "grant-support",
        instruction: "Summarize the grant opportunity, eligibility, deadline, required documents, budget notes, donor fit, and risks.",
        requiresApproval: false
      },
      {
        skillKey: "proposal-writing",
        instruction: "Draft a grant response outline and approval-ready next steps.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "travel-proposal",
    name: "Travel proposal",
    category: "travel",
    description: "Prepare an itinerary-style proposal using destination, supplier, visa, pricing, and client context.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Travel Consultant",
    steps: [
      {
        skillKey: "travel-planning",
        instruction: "Collect approved destination, supplier, visa, pricing, inclusion, exclusion, and itinerary context from memory.",
        requiresApproval: false
      },
      {
        skillKey: "proposal-writing",
        instruction: "Draft a travel proposal with itinerary, assumptions, exclusions, pricing notes, payment terms, and next steps.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "education-parent-update",
    name: "Education parent update",
    category: "education",
    description: "Draft parent/student communications, notices, admissions replies, and programme updates for approval.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Education Administrator",
    steps: [
      {
        skillKey: "education-admin",
        instruction: "Summarize the education context, audience, required facts, and sensitive information boundaries.",
        requiresApproval: false
      },
      {
        skillKey: "email-drafting",
        instruction: "Draft a clear parent/student message for approval.",
        requiresApproval: true
      }
    ]
  }
];

export const starterWorkflowTemplates = workflowTemplateCatalog.filter((workflow) =>
  ["organisation-setup", "document-intake-summary", "weekly-marketing-plan", "proposal-draft", "customer-support-triage", "monthly-business-report"].includes(workflow.key)
);

export const industryTemplates = [
  {
    key: "general-business",
    name: "General Business",
    description: "A practical starter setup for service businesses, studios, agencies, and small teams.",
    organisationTypes: ["COMPANY", "BRAND", "DEPARTMENT", "PROJECT"],
    countryCode: "KE",
    brandVoiceTone: "Clear, warm, professional",
    brandVoiceRules: "Use simple business language. Ask for missing documents, examples, or approvals before acting externally.",
    businessRules: [
      "External messages, invoices, CRM updates, and public content require human approval.",
      "Use only approved organisation knowledge and explicitly shared workspace knowledge."
    ],
    knowledgeCollections: ["Organization profile", "Company knowledge", "Clients", "Services", "Templates", "Policies"],
    recommendedEmployees: ["CEO Assistant", "Marketing Manager", "Proposal Writer", "Finance Assistant", "Customer Support", "Research Analyst", "Operations Assistant", "Sales Assistant"],
    skillKeys: ["business-briefing", "company-onboarding", "knowledge-structuring", "document-analysis", "marketing-planning", "content-creation", "proposal-writing", "finance-support", "operations-planning", "research", "customer-support", "email-drafting", "sales-follow-up", "crm-support", "data-reporting"],
    workflowTemplateKeys: ["organisation-setup", "document-intake-summary", "weekly-marketing-plan", "content-calendar", "proposal-draft", "sales-follow-up", "customer-support-triage", "mailbox-triage-draft", "invoice-review", "monthly-business-report", "sop-checklist"]
  },
  {
    key: "travel-agency",
    name: "Travel Agency",
    description: "Starter AI workforce structure for travel agencies, tour operators, and destination consultants.",
    organisationTypes: ["COMPANY", "BRAND", "BRANCH"],
    countryCode: "KE",
    brandVoiceTone: "Helpful, organized, destination-aware, and commercially practical",
    brandVoiceRules: "Be specific about destinations, dates, assumptions, inclusions, exclusions, and approval checkpoints.",
    businessRules: [
      "Do not confirm bookings, prices, visas, or availability without human approval.",
      "Separate client-facing itinerary drafts from internal supplier notes."
    ],
    knowledgeCollections: ["Organization profile", "Destinations", "Suppliers", "Visa Requirements", "Client Itineraries", "Packages", "Policies"],
    recommendedEmployees: ["CEO Assistant", "Marketing Manager", "Travel Consultant", "Proposal Writer", "Customer Support", "Sales Assistant", "Research Analyst", "Operations Assistant"],
    skillKeys: ["business-briefing", "company-onboarding", "knowledge-structuring", "document-analysis", "marketing-planning", "content-creation", "proposal-writing", "research", "customer-support", "email-drafting", "sales-follow-up", "crm-support", "travel-planning", "data-reporting"],
    workflowTemplateKeys: ["organisation-setup", "document-intake-summary", "travel-proposal", "sales-follow-up", "customer-support-triage", "mailbox-triage-draft", "weekly-marketing-plan", "content-calendar", "monthly-business-report"]
  },
  {
    key: "foundation-ngo",
    name: "Foundation / NGO",
    description: "Starter structure for foundations, NGOs, programmes, grants, donors, and impact reporting.",
    organisationTypes: ["FOUNDATION", "NGO", "PROGRAMME", "PROJECT"],
    countryCode: "KE",
    brandVoiceTone: "Trustworthy, impact-focused, respectful, and evidence-led",
    brandVoiceRules: "Use clear impact language. Keep donor, beneficiary, and programme information separated by permission.",
    businessRules: [
      "Grant applications, donor communications, beneficiary data, and public reports require human approval.",
      "Do not expose sensitive beneficiary details unless explicitly approved."
    ],
    knowledgeCollections: ["Organization profile", "Grants", "Donors", "Programmes", "Beneficiaries", "Partnerships", "Reports"],
    recommendedEmployees: ["CEO Assistant", "Grant Assistant", "Proposal Writer", "Research Analyst", "Finance Assistant", "Customer Support", "Operations Assistant"],
    skillKeys: ["business-briefing", "company-onboarding", "knowledge-structuring", "document-analysis", "proposal-writing", "research", "finance-support", "email-drafting", "grant-support", "data-reporting", "operations-planning"],
    workflowTemplateKeys: ["organisation-setup", "document-intake-summary", "grant-application-review", "proposal-draft", "invoice-review", "monthly-business-report", "sop-checklist"]
  },
  {
    key: "school-education",
    name: "School / Education",
    description: "Starter structure for schools, colleges, universities, training centres, and education programmes.",
    organisationTypes: ["SCHOOL", "UNIVERSITY", "DEPARTMENT", "PROGRAMME"],
    countryCode: "KE",
    brandVoiceTone: "Clear, supportive, professional, and parent/student-friendly",
    brandVoiceRules: "Be accurate, structured, and careful with student, parent, and staff information.",
    businessRules: [
      "Student records, parent messages, policy updates, and public announcements require human approval.",
      "Keep academic, finance, parent, and operations context permission-scoped."
    ],
    knowledgeCollections: ["Organization profile", "Admissions", "Programmes", "Students", "Parents", "Policies", "Reports"],
    recommendedEmployees: ["CEO Assistant", "Education Administrator", "Customer Support", "Finance Assistant", "Research Analyst", "Marketing Manager", "Operations Assistant"],
    skillKeys: ["business-briefing", "company-onboarding", "knowledge-structuring", "document-analysis", "customer-support", "finance-support", "research", "marketing-planning", "content-creation", "email-drafting", "education-admin", "operations-planning"],
    workflowTemplateKeys: ["organisation-setup", "document-intake-summary", "education-parent-update", "customer-support-triage", "invoice-review", "weekly-marketing-plan", "monthly-business-report"]
  }
];
