export const standardUploadLimitBytes = 30 * 1024 * 1024;
export const upgradeUploadLimitBytes = 50 * 1024 * 1024;
export const serverActionUploadLimit = "55mb";

export const standardUploadLimitLabel = "30 MB";
export const upgradeUploadLimitLabel = "50 MB";
export const storageUpgradePriceKes = 100;

export type UploadPolicyCode =
  | "ok"
  | "file"
  | "file-size"
  | "file-type"
  | "storage-upgrade"
  | "storage-upgrade-limit";

export const allowedUploadTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/markdown",
  "text/plain"
]);

export const uploadAccept = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".csv",
  ".md",
  ".txt",
  "image/*",
  "audio/*",
  "video/*"
].join(",");

export function isMarkdownFile(fileName: string) {
  return fileName.toLowerCase().endsWith(".md");
}

export function isUpgradeMediaType(contentType: string) {
  return contentType.startsWith("video/") || contentType.startsWith("audio/") || contentType.startsWith("image/");
}

export function validateArtifactUpload({
  fileName,
  size,
  type
}: {
  fileName: string;
  size: number;
  type: string;
}): UploadPolicyCode {
  if (!fileName || size <= 0) {
    return "file";
  }

  if (size > upgradeUploadLimitBytes) {
    return "storage-upgrade-limit";
  }

  if (isUpgradeMediaType(type)) {
    return "storage-upgrade";
  }

  if (size > standardUploadLimitBytes) {
    return "storage-upgrade";
  }

  if (type && !allowedUploadTypes.has(type) && !isMarkdownFile(fileName)) {
    return "file-type";
  }

  return "ok";
}

export function uploadPolicyMessage(code?: string) {
  switch (code) {
    case "uploaded":
      return {
        tone: "success" as const,
        title: "Upload complete",
        description: "Nice. The file is now available in this organisation workspace."
      };
    case "file":
      return {
        tone: "warning" as const,
        title: "Choose a file first",
        description: "Pick a document and try again. We will keep it scoped to this organisation."
      };
    case "file-size":
      return {
        tone: "warning" as const,
        title: "This file needs more storage",
        description: `Standard uploads support documents up to ${standardUploadLimitLabel}. Add the KES ${storageUpgradePriceKes} storage boost to handle larger files up to ${upgradeUploadLimitLabel}.`
      };
    case "storage-upgrade":
      return {
        tone: "warning" as const,
        title: "Storage boost available",
        description: `Media files and documents above ${standardUploadLimitLabel} need the KES ${storageUpgradePriceKes} storage boost, which supports uploads up to ${upgradeUploadLimitLabel}.`
      };
    case "storage-upgrade-limit":
      return {
        tone: "warning" as const,
        title: "File is above the current upload limit",
        description: `The largest supported upload right now is ${upgradeUploadLimitLabel}. Compress the file or split it into smaller pieces, then upload again.`
      };
    case "file-type":
      return {
        tone: "warning" as const,
        title: "That file type is not ready yet",
        description: "PDF, Word, Excel, PowerPoint, CSV, Markdown, and text files are ready today. Media uploads are handled through the storage boost."
      };
    case "storage":
      return {
        tone: "warning" as const,
        title: "Storage needs a quick check",
        description: "The file was accepted, but storage could not save it. Check the storage bucket settings and try again."
      };
    case "rate-limit":
      return {
        tone: "warning" as const,
        title: "Give it a short moment",
        description: "Too many uploads arrived at once. Wait a little, then try again."
      };
    default:
      return null;
  }
}
