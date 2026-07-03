export const roles = {
  KIPEKEE_ADMIN: "KIPEKEE_ADMIN",
  CLIENT_OWNER: "CLIENT_OWNER",
  CLIENT_ADMIN: "CLIENT_ADMIN",
  CLIENT_MEMBER: "CLIENT_MEMBER",
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER"
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export function isKipekeeAdmin(user: { role: string; company: { slug: string } }) {
  return user.role === roles.KIPEKEE_ADMIN;
}

export function canManageCompany(user: { role: string; company: { slug: string } }) {
  return isKipekeeAdmin(user) || user.role === roles.CLIENT_OWNER || user.role === roles.CLIENT_ADMIN || user.role === roles.OWNER || user.role === roles.ADMIN;
}

export function canManageTeam(user: { role: string; company: { slug: string } }) {
  return isKipekeeAdmin(user) || user.role === roles.CLIENT_OWNER || user.role === roles.CLIENT_ADMIN || user.role === roles.OWNER || user.role === roles.ADMIN;
}

export function canManageBilling(user: { role: string; company: { slug: string } }) {
  return isKipekeeAdmin(user) || user.role === roles.CLIENT_OWNER || user.role === roles.OWNER;
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    KIPEKEE_ADMIN: "Kipekee admin",
    CLIENT_OWNER: "Client owner",
    CLIENT_ADMIN: "Client admin",
    CLIENT_MEMBER: "Team member",
    OWNER: "Owner",
    ADMIN: "Admin",
    MEMBER: "Member"
  };

  return labels[role] ?? role;
}
