// Pure selection logic for the CAS reaper, split out of reaper.ts (which imports
// prisma/storage and so can't be imported in vitest). The DB queries and S3
// deletes stay in reaper.ts; the decisions about WHAT to reap live — and are
// tested — here.

/** Artifact ids that are superseded: a newer row exists for the same source+kind
 *  AND the row is older than the grace cutoff. Input MUST be newest-first. */
export function selectSupersededIds<
	T extends {
		id: string;
		sourceSha256: string;
		kind: string;
		createdAt: Date;
	},
>(artifactsNewestFirst: T[], cutoff: Date): string[] {
	const newestSeen = new Set<string>();
	const ids: string[] = [];
	for (const a of artifactsNewestFirst) {
		const k = `${a.sourceSha256}|${a.kind}`;
		if (!newestSeen.has(k)) {
			newestSeen.add(k);
			continue;
		}
		if (a.createdAt < cutoff) ids.push(a.id);
	}
	return ids;
}

/** Diff ids whose old or new version no longer exists. */
export function selectDanglingDiffIds<
	T extends { id: string; oldVersionId: string; newVersionId: string },
>(diffs: T[], existingVersionIds: Set<string>): string[] {
	return diffs.flatMap((d) =>
		!existingVersionIds.has(d.oldVersionId) ||
		!existingVersionIds.has(d.newVersionId)
			? [d.id]
			: [],
	);
}

/** The set of CAS keys still referenced by any remaining artifact/diff row. */
export function computeLiveKeys(
	artifacts: { htmlKey: string; figureShas: string[] }[],
	diffs: { redlineKey: string }[],
	figureKey: (sha: string) => string,
): Set<string> {
	const live = new Set<string>();
	for (const a of artifacts) {
		live.add(a.htmlKey);
		for (const sha of a.figureShas) live.add(figureKey(sha));
	}
	for (const d of diffs) live.add(d.redlineKey);
	return live;
}
