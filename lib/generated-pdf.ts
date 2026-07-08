import { randomUUID } from "crypto";
import { prisma } from "./db";
import { safeFileName, storeArtifactObject } from "./storage";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars = 86) {
  const lines: string[] = [];
  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of line.split(/\s+/)) {
      if ((current + " " + word).trim().length > maxChars) {
        lines.push(current.trim());
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function pageContent(lines: string[]) {
  const commands = ["BT", "/F1 10 Tf", "50 780 Td", "14 TL"];
  for (const line of lines) {
    if (line) {
      commands.push(`(${escapePdfText(line)}) Tj`);
    }
    commands.push("T*");
  }
  commands.push("ET");
  return commands.join("\n");
}

export function createSimplePdfBuffer(title: string, body: string) {
  const allLines = wrapText([title, "", body].join("\n")).slice(0, 900);
  const pages: string[][] = [];
  for (let index = 0; index < allLines.length; index += 48) {
    pages.push(allLines.slice(index, index + 48));
  }
  if (!pages.length) pages.push([title]);

  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
  void catalogId;
  const pagesId = addObject("PAGES_PLACEHOLDER");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];

  for (const lines of pages) {
    const stream = pageContent(lines);
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

export function wantsDownloadablePdf(prompt: string) {
  return /\b(downloadable|download|pdf|report|file)\b/i.test(prompt) && /\b(pdf|downloadable|download)\b/i.test(prompt);
}

export async function createGeneratedPdfArtifact({
  companyId,
  employeeId,
  sessionId,
  title,
  content
}: {
  companyId: string;
  employeeId: string;
  sessionId: string;
  title: string;
  content: string;
}) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { id: true, slug: true, workspaceId: true }
  });
  const artifactId = `artifact_${randomUUID()}`;
  const fileName = `${safeFileName(title)}.pdf`;
  const bytes = createSimplePdfBuffer(title, content);
  const stored = await storeArtifactObject({
    artifactId,
    bytes,
    companyId: company.id,
    companySlug: company.slug,
    contentType: "application/pdf",
    fileName
  });

  const result = await prisma.$transaction(async (tx) => {
    const collection = await tx.knowledgeCollection.create({
      data: {
        workspaceId: company.workspaceId,
        companyId: company.id,
        ownerType: "COMPANY",
        ownerId: company.id,
        name: "Generated deliverables",
        category: "generated-deliverables",
        sensitivity: "NORMAL"
      }
    });

    const artifact = await tx.artifact.create({
      data: {
        id: artifactId,
        workspaceId: company.workspaceId,
        companyId: company.id,
        collectionId: collection.id,
        uploadedByUserId: null,
        title,
        kind: "application/pdf",
        storagePath: stored.storagePath,
        storageProvider: stored.storageProvider,
        fileSizeBytes: bytes.length,
        extractedText: content.slice(0, 25000),
        memoryStatus: "ARTIFACT_ONLY"
      }
    });

    await tx.artifactAccess.create({
      data: {
        artifactId: artifact.id,
        employeeId,
        canUseAsMemory: false
      }
    });

    await tx.auditLog.create({
      data: {
        workspaceId: company.workspaceId,
        companyId: company.id,
        actor: "system:generated-artifact",
        action: "artifact.generated_pdf",
        target: title,
        metadata: JSON.stringify({ artifactId: artifact.id, sessionId, bytes: bytes.length })
      }
    });

    return artifact;
  });

  return {
    artifactId: result.id,
    title: result.title,
    downloadPath: `/api/artifacts/${result.id}/download`
  };
}
