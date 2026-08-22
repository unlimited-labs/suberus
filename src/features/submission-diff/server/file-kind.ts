import { ArtifactKind } from "@/generated/prisma/enums";

/**
 * Single source of truth for the format -> kind mapping, shared by the normalize
 * worker (which sidecar to call), the read path (which artifact to resolve), and
 * the upload trigger (whether to enqueue at all).
 */
export function fileKind(fileName: string): ArtifactKind | null {
	const ext = fileName.toLowerCase().split(".").pop();
	if (ext === "docx") return ArtifactKind.DOCX;
	if (ext === "pdf") return ArtifactKind.PDF;
	return null;
}
