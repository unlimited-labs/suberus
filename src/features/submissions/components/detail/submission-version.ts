import type { SubmissionDetail } from "@/features/submissions/server/submissions";

/** Resolves the fields to display for the selected version, falling back to the current submission. */
export function resolveVersionDisplay(
	submission: SubmissionDetail["submission"],
	versions: SubmissionDetail["versions"],
	selectedVersion: number,
) {
	const versionData = versions.find((v) => v.version === selectedVersion);
	return {
		title: versionData?.title ?? submission.title,
		content: versionData?.content ?? submission.content,
		authors: versionData?.authors ?? submission.authors,
		keywords: versionData?.keywords ?? submission.keywords,
		file: versionData?.file ?? null,
	};
}
