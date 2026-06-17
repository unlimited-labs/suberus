import diff_match_patch from "diff-match-patch";

export type DiffOp = "equal" | "insert" | "delete";

export interface DiffSegment {
	type: DiffOp;
	value: string;
}

export interface DiffStats {
	insertions: number;
	deletions: number;
}

/**
 * Character-level diff with semantic cleanup (Google-Docs-style readable chunks).
 * Uses diff-match-patch rather than jsdiff: on document-scale input jsdiff's
 * word/char diff has a catastrophic worst case, whereas diff-match-patch's
 * `Diff_Timeout` returns a valid-but-suboptimal result instead of hanging.
 */
export function diffText(oldText: string, newText: string): DiffSegment[] {
	const dmp = new diff_match_patch();
	// Seconds; bound the LCS search so a pathological input never blocks.
	dmp.Diff_Timeout = 1;
	const diffs = dmp.diff_main(oldText ?? "", newText ?? "");
	dmp.diff_cleanupSemantic(diffs);
	return diffs.map(([op, value]) => ({
		type:
			op === diff_match_patch.DIFF_INSERT
				? "insert"
				: op === diff_match_patch.DIFF_DELETE
					? "delete"
					: "equal",
		value,
	}));
}

/** Count of changed characters, split by direction. */
export function diffStats(segments: DiffSegment[]): DiffStats {
	let insertions = 0;
	let deletions = 0;
	for (const seg of segments) {
		if (seg.type === "insert") insertions += seg.value.length;
		else if (seg.type === "delete") deletions += seg.value.length;
	}
	return { insertions, deletions };
}

/** Whether a diff contains any insertion or deletion. */
export function hasChanges(segments: DiffSegment[]): boolean {
	return segments.some((s) => s.type !== "equal");
}

/**
 * Whether the attached file changed between two versions. A null id on either
 * side means "no file"; two nulls count as unchanged.
 */
export function fileChanged(
	oldFileId: string | null | undefined,
	newFileId: string | null | undefined,
): boolean {
	return (oldFileId ?? null) !== (newFileId ?? null);
}
