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
    description: "8 AI employees, support, workflows, document memory",
    includedEmployees: 8,
    loops: true,
    documentMemory: true
  },
  {
    name: "Max Onboarding",
    priceKes: 50000,
    description: "Advanced setup, priority support, deeper workflow setup",
    includedEmployees: 12,
    loops: true,
    documentMemory: true
  },
  {
    name: "Custom Workflow / Integration",
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
    description: "Summarizes priorities, risks, and next actions for business leaders.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "marketing-planning",
    name: "Marketing Planning",
    category: "marketing",
    description: "Creates campaigns, content calendars, positioning, and growth recommendations.",
    defaultToolsets: ["chat", "memory", "documents", "web", "audit"]
  },
  {
    key: "proposal-writing",
    name: "Proposal Writing",
    category: "sales",
    description: "Drafts proposals, quotations, assumptions, exclusions, timelines, and executive summaries.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "finance-support",
    name: "Finance Support",
    category: "finance",
    description: "Organizes invoice, payment, budget, and financial reminder workflows.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "research",
    name: "Research",
    category: "research",
    description: "Finds, compares, and summarizes market, competitor, and customer information.",
    defaultToolsets: ["chat", "memory", "documents", "web", "audit"]
  },
  {
    key: "customer-support",
    name: "Customer Support",
    category: "support",
    description: "Drafts responses, FAQs, triage notes, and customer follow-up actions.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "brand-management",
    name: "Brand Management",
    category: "brand",
    description: "Maintains brand voice, messaging consistency, and creative direction.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "software-planning",
    name: "Software Planning",
    category: "engineering",
    description: "Plans software tasks, specs, technical reports, and delivery checklists.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  },
  {
    key: "email-drafting",
    name: "Email Drafting",
    category: "communications",
    description: "Reads permitted mailbox context and drafts approval-first email replies.",
    defaultToolsets: ["chat", "memory", "documents", "audit"]
  }
];

export const employeeTemplates = [
  { name: "CEO Assistant", skills: ["business-briefing", "research", "email-drafting"] },
  { name: "Creative Director", skills: ["brand-management", "marketing-planning"] },
  { name: "Marketing Manager", skills: ["marketing-planning", "research", "brand-management"] },
  { name: "Proposal Writer", skills: ["proposal-writing", "research"] },
  { name: "Finance Assistant", skills: ["finance-support", "email-drafting"] },
  { name: "Software Engineer", skills: ["software-planning", "research"] },
  { name: "Brand Manager", skills: ["brand-management", "marketing-planning"] },
  { name: "Social Media Manager", skills: ["marketing-planning", "brand-management"] },
  { name: "Research Analyst", skills: ["research", "business-briefing"] },
  { name: "Customer Support", skills: ["customer-support", "email-drafting"] },
  { name: "Sales Assistant", skills: ["proposal-writing", "customer-support", "email-drafting"] },
  { name: "CRM Assistant", skills: ["customer-support", "business-briefing"] },
  { name: "Operations Assistant", skills: ["business-briefing", "finance-support"] }
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
    key: "weekly-marketing-plan",
    name: "Weekly marketing plan",
    category: "marketing",
    description: "Prepare a weekly marketing plan with campaign priorities, content ideas, and next actions.",
    triggerType: "SCHEDULED",
    schedule: "Every Monday 09:00 Africa/Nairobi",
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Marketing Manager",
    steps: [
      {
        skillKey: "marketing-planning",
        instruction: "Review approved company memory and draft this week's marketing plan.",
        requiresApproval: true
      }
    ]
  },
  {
    key: "proposal-draft",
    name: "Proposal draft",
    category: "sales",
    description: "Draft a practical business proposal from approved company context and user requirements.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Proposal Writer",
    steps: [
      {
        skillKey: "proposal-writing",
        instruction: "Create a proposal structure, executive summary, scope, assumptions, exclusions, and next steps.",
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
    key: "grant-application-review",
    name: "Grant application review",
    category: "foundation",
    description: "Review grant opportunity fit, requirements, deadlines, documents, and approval-ready next steps.",
    triggerType: "MANUAL",
    schedule: null,
    approvalPolicy: "APPROVAL_REQUIRED",
    defaultEmployeeName: "Research Analyst",
    steps: [
      {
        skillKey: "research",
        instruction: "Summarize the grant opportunity, eligibility, deadline, required documents, and risks.",
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
    defaultEmployeeName: "Proposal Writer",
    steps: [
      {
        skillKey: "research",
        instruction: "Collect approved destination, supplier, visa, and itinerary context from memory.",
        requiresApproval: false
      },
      {
        skillKey: "proposal-writing",
        instruction: "Draft a travel proposal with itinerary, assumptions, exclusions, pricing notes, and next steps.",
        requiresApproval: true
      }
    ]
  }
];

export const starterWorkflowTemplates = workflowTemplateCatalog.slice(0, 2);

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
    recommendedEmployees: ["CEO Assistant", "Marketing Manager", "Proposal Writer", "Finance Assistant", "Customer Support", "Research Analyst"],
    skillKeys: ["business-briefing", "marketing-planning", "proposal-writing", "finance-support", "research", "customer-support", "email-drafting"],
    workflowTemplateKeys: ["weekly-marketing-plan", "proposal-draft", "customer-support-triage", "invoice-review"]
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
    recommendedEmployees: ["CEO Assistant", "Marketing Manager", "Proposal Writer", "Customer Support", "Sales Assistant", "Research Analyst"],
    skillKeys: ["business-briefing", "marketing-planning", "proposal-writing", "research", "customer-support", "email-drafting"],
    workflowTemplateKeys: ["travel-proposal", "customer-support-triage", "weekly-marketing-plan"]
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
    recommendedEmployees: ["CEO Assistant", "Proposal Writer", "Research Analyst", "Finance Assistant", "Customer Support"],
    skillKeys: ["business-briefing", "proposal-writing", "research", "finance-support", "email-drafting"],
    workflowTemplateKeys: ["grant-application-review", "proposal-draft", "invoice-review"]
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
    recommendedEmployees: ["CEO Assistant", "Customer Support", "Finance Assistant", "Research Analyst", "Marketing Manager"],
    skillKeys: ["business-briefing", "customer-support", "finance-support", "research", "marketing-planning", "email-drafting"],
    workflowTemplateKeys: ["customer-support-triage", "invoice-review", "weekly-marketing-plan"]
  }
];
