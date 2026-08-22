import type { SubmissionDetail } from "@/features/submissions/server/submissions";

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
