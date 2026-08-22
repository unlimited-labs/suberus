export interface DiffStats {
	insertions: number;
	deletions: number;
}

/**
 * The redline itself is produced by the docx-api sidecar (xmldiff structural
 * tree diff) and DOMPurify-sanitized in the worker; this only tallies the marks
 * for the "+N −M changed blocks" summary.
 */
export function redlineStats(redline: string): DiffStats {
	return {
		insertions: (redline.match(/<ins\b/g) ?? []).length,
		deletions: (redline.match(/<del\b/g) ?? []).length,
	};
}
