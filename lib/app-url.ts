export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.KIPEKEE_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export function inviteUrl(token: string, origin?: string | null) {
  const baseUrl = (origin || appUrl()).replace(/\/$/, "");
  return `${baseUrl}/invite/${token}`;
}
