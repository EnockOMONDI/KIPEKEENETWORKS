export function pageNotice(page: string, code?: string) {
  if (!code) return null;

  const key = `${page}:${code}`;
  const messages: Record<string, { title: string; description: string; tone: "success" | "warning" | "neutral" }> = {
    "chat:workflow": {
      tone: "warning",
      title: "That work instruction is not assigned yet",
      description: "Choose an assigned work instruction, or ask an organisation admin to enable it for this AI employee."
    },
    "workflows:employee": {
      tone: "warning",
      title: "Choose an AI employee first",
      description: "A work instruction needs an employee owner so Kipekee knows who should run it."
    },
    "workflows:rate-limit": {
      tone: "warning",
      title: "Give the runner a short moment",
      description: "Too many run requests arrived at once. Wait a little, then run the instruction again."
    },
    "workflows:runtime": {
      tone: "warning",
      title: "Runtime is getting ready",
      description: "This organisation runtime is not ready to run the instruction yet. Check Systems or try again shortly."
    },
    "onboarding:company-name": {
      tone: "warning",
      title: "Add the organisation name",
      description: "Start with the client, brand, foundation, or business name, then Kipekee can create the workspace."
    },
    "billing:company": {
      tone: "warning",
      title: "Choose a billing organisation",
      description: "Select the organisation that should receive this invoice and try again."
    },
    "integrations:provider": {
      tone: "warning",
      title: "Choose a supported service",
      description: "Pick one of the listed services so Kipekee can create a clean integration request."
    },
    "team:missing": {
      tone: "warning",
      title: "Invite details are missing",
      description: "Add the team member's name, email, and role, then create the invite again."
    },
    "shared:rate-limit": {
      tone: "warning",
      title: "Give it a short moment",
      description: "Too many requests arrived at once. Wait a little, then try again."
    }
  };

  return messages[key] ?? messages[`shared:${code}`] ?? {
    tone: "warning" as const,
    title: "Something needs attention",
    description: "Review the form and try again. If it repeats, check Systems for the support details."
  };
}
