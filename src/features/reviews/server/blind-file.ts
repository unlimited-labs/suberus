import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
import { getSetting } from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import type { BlindAs } from "@/shared/server/files";

function extensionOf(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(dot) : "";
}

/** Uploads are stored as `Firstname_Lastname.ext`, so double-blind needs a neutral `v{n}.ext`. */
export function blindFileName(originalName: string, version: number): string {
	return `v${version}${extensionOf(originalName)}`;
}

/** A reviewer's attachment keeps its upload name, which may carry the reviewer's own name. */
export function reviewAttachmentName(originalName: string): string {
	const ext = extensionOf(originalName).slice(1).toLowerCase();
	return SUPPORTED_FILE_EXTENSIONS.some((e) => e === ext)
		? `review.${ext}`
		: "review";
}

export async function blindDownloadName(
	originalName: string,
	blindAs: NonNullable<BlindAs>,
): Promise<string> {
	const { reviewMode } = await getSetting(
		SUBMISSION_TYPE_TO_KEY[blindAs.submissionType],
	);
	if (blindAs.hide === "author") {
		return reviewMode === "DOUBLE_BLIND"
			? blindFileName(originalName, blindAs.version)
			: originalName;
	}
	return reviewMode === "OPEN"
		? originalName
		: reviewAttachmentName(originalName);
}
