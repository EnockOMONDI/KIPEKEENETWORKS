import { envPresence } from "./server-log";

const healthEnvKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "KIPEKEE_JOB_SIGNING_SECRET",
  "KIPEKEE_HERMES_MODE",
  "KIPEKEE_STORAGE_PROVIDER",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "KIPEKEE_STORAGE_BUCKET"
];

export function healthEnvPresence() {
  return envPresence(healthEnvKeys);
}

export function databaseEnvPresence() {
  return envPresence(["DATABASE_URL", "DIRECT_URL"]);
}
