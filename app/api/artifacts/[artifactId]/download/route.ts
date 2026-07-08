import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadArtifactObject, safeFileName } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ artifactId: string }> }) {
  const user = await currentUser();
  if (!user?.workspace || !user.company) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { artifactId } = await params;
  const artifact = await prisma.artifact.findFirst({
    where: {
      id: artifactId,
      OR: [
        { companyId: user.companyId },
        { workspaceId: user.workspaceId, companyId: null }
      ]
    },
    select: {
      title: true,
      kind: true,
      storagePath: true,
      storageProvider: true
    }
  });

  if (!artifact) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const bytes = await loadArtifactObject({
      storagePath: artifact.storagePath,
      storageProvider: artifact.storageProvider
    });

    const fileName = safeFileName(artifact.title.endsWith(".pdf") ? artifact.title : `${artifact.title}.pdf`);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": artifact.kind || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "File is not available right now." }, { status: 404 });
  }
}
