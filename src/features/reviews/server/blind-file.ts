import { getSetting } from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import type { SubmissionType } from "@/generated/prisma/enums";

/** Uploads are stored as `Firstname_Lastname.ext`, so double-blind needs a neutral `v{n}.ext`. */
export function blindFileName(originalName: string, version: number): string {
	const dot = originalName.lastIndexOf(".");
	const ext = dot > 0 ? originalName.slice(dot) : "";
	return `v${version}${ext}`;
}

export async function reviewerDownloadName(
	originalName: string,
	submissionType: SubmissionType,
	version: number,
): Promise<string> {
	const config = await getSetting(SUBMISSION_TYPE_TO_KEY[submissionType]);
	return config.reviewMode === "DOUBLE_BLIND"
		? blindFileName(originalName, version)
		: originalName;
}
