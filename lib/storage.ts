import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { envPresence, logError, logInfo } from "./server-log";

export type StoredArtifactObject = {
  storagePath: string;
  storageProvider: "local" | "supabase";
};

export function storageProvider() {
  return process.env.KIPEKEE_STORAGE_PROVIDER || "local";
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180) || "artifact";
}

export function artifactObjectKey({
  artifactId,
  companyId,
  fileName
}: {
  artifactId: string;
  companyId: string;
  fileName: string;
}) {
  return `companies/${companyId}/artifacts/${artifactId}/${Date.now()}-${safeFileName(fileName)}`;
}

function supabaseStorageClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage is not configured.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function storeArtifactObject({
  artifactId,
  bytes,
  companySlug,
  companyId,
  contentType,
  fileName
}: {
  artifactId: string;
  bytes: Buffer;
  companySlug: string;
  companyId: string;
  contentType: string;
  fileName: string;
}): Promise<StoredArtifactObject> {
  const provider = storageProvider();

  if (provider === "supabase") {
    const bucket = process.env.KIPEKEE_STORAGE_BUCKET || "company-artifacts";
    const objectKey = artifactObjectKey({ artifactId, companyId, fileName });
    logInfo("storage.upload.started", {
      artifactId,
      companyId,
      provider,
      bucket,
      contentType,
      bytes: bytes.length,
      env: envPresence(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "KIPEKEE_STORAGE_BUCKET"])
    });
    const { error } = await supabaseStorageClient()
      .storage
      .from(bucket)
      .upload(objectKey, bytes, {
        contentType,
        upsert: false
      });

    if (error) {
      logError("storage.upload.failed", error, { artifactId, companyId, provider, bucket });
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    return {
      storagePath: objectKey,
      storageProvider: "supabase"
    };
  }

  if (process.env.NODE_ENV === "production") {
    const error = new Error("Local artifact storage is disabled in production.");
    logError("storage.local_disabled_in_production", error, { artifactId, companyId, provider });
    throw error;
  }

  const companyDir = path.join(process.cwd(), "uploads", companySlug);
  await mkdir(companyDir, { recursive: true });
  const storagePath = path.join(companyDir, `${Date.now()}-${safeFileName(fileName)}`);
  await writeFile(storagePath, bytes);

  return {
    storagePath,
    storageProvider: "local"
  };
}
