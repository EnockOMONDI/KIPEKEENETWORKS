import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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

function safeContentType(contentType: string) {
  if (contentType.includes("/")) {
    return contentType;
  }
  if (contentType === "document" || contentType === "markdown" || contentType === "text") {
    return "text/markdown";
  }
  return "application/octet-stream";
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

function supabaseStorageConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage is not configured.");
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
    bucket: process.env.KIPEKEE_STORAGE_BUCKET || "company-artifacts"
  };
}

function encodeObjectPath(objectPath: string) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

async function uploadSupabaseObject({
  objectKey,
  bytes,
  contentType
}: {
  objectKey: string;
  bytes: Buffer;
  contentType: string;
}) {
  const { url, serviceRoleKey, bucket } = supabaseStorageConfig();
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(objectKey)}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": contentType,
      "x-upsert": "false"
    },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as BodyInit
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Supabase Storage upload failed with status ${response.status}.`);
  }
}

async function downloadSupabaseObject(objectPath: string) {
  const { url, serviceRoleKey, bucket } = supabaseStorageConfig();
  const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Supabase Storage download failed with status ${response.status}.`);
  }

  return Buffer.from(await response.arrayBuffer());
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
    const objectKey = artifactObjectKey({ artifactId, companyId, fileName });
    logInfo("storage.upload.started", {
      artifactId,
      companyId,
      provider,
      bucket: process.env.KIPEKEE_STORAGE_BUCKET || "company-artifacts",
      contentType: safeContentType(contentType),
      bytes: bytes.length,
      env: envPresence(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "KIPEKEE_STORAGE_BUCKET"])
    });
    try {
      await uploadSupabaseObject({ objectKey, bytes, contentType: safeContentType(contentType) });
    } catch (error) {
      logError("storage.upload.failed", error, {
        artifactId,
        companyId,
        provider,
        bucket: process.env.KIPEKEE_STORAGE_BUCKET || "company-artifacts"
      });
      throw error;
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

export async function loadArtifactObject({
  storagePath,
  storageProvider
}: {
  storagePath: string;
  storageProvider: string;
}) {
  if (storageProvider === "supabase") {
    return downloadSupabaseObject(storagePath);
  }

  return readFile(storagePath);
}
