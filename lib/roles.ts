export const roles = {
  KIPEKEE_ADMIN: "KIPEKEE_ADMIN",
  CLIENT_OWNER: "CLIENT_OWNER",
  CLIENT_ADMIN: "CLIENT_ADMIN",
  CLIENT_MEMBER: "CLIENT_MEMBER",
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER"
} as const;

export type Role = (typeof roles)[keyof typeof roles];

type RoleUser = {
  role: string;
  memberRole?: string | null;
};

function effectiveRole(user: RoleUser) {
  return user.memberRole || user.role;
}

export function isKipekeeAdmin(user: RoleUser) {
  return user.role === roles.KIPEKEE_ADMIN;
}

export function canManageCompany(user: RoleUser) {
  const role = effectiveRole(user);
  return isKipekeeAdmin(user) || role === roles.CLIENT_OWNER || role === roles.CLIENT_ADMIN || role === roles.OWNER || role === roles.ADMIN;
}

export function canManageTeam(user: RoleUser) {
  const role = effectiveRole(user);
  return isKipekeeAdmin(user) || role === roles.CLIENT_OWNER || role === roles.CLIENT_ADMIN || role === roles.OWNER || role === roles.ADMIN;
}

export function canManageBilling(user: RoleUser) {
  const role = effectiveRole(user);
  return isKipekeeAdmin(user) || role === roles.CLIENT_OWNER || role === roles.OWNER;
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    KIPEKEE_ADMIN: "Kipekee admin",
    CLIENT_OWNER: "Client owner",
    CLIENT_ADMIN: "Client admin",
    CLIENT_MEMBER: "Team member",
    OWNER: "Owner",
    ADMIN: "Admin",
    MEMBER: "Member",
    VIEWER: "Viewer"
  };

  return labels[role] ?? role;
}
