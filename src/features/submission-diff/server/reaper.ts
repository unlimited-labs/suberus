import { logger } from "@/logger";
import { prisma } from "@/shared/server/db.server";
import { deleteFile } from "@/shared/server/storage";
import { figureKey } from "./cas";
import {
	computeLiveKeys,
	selectDanglingDiffIds,
	selectSupersededIds,
} from "./reaper-plan";

// Grace window: never touch an object/row younger than this, so a blob just
// uploaded by an in-flight normalize (whose artifact row isn't committed yet)
// can't be swept out from under it.
const GRACE_MS = 24 * 60 * 60 * 1000;

export interface ReapResult {
	supersededArtifacts: number;
	danglingDiffs: number;
	sweptObjects: number;
}

/**
 * Mark-and-sweep GC for the `version-diff/` CAS. Two steps, both grace-gated:
 *   1. Reap rows nothing will read again — superseded artifacts (a newer toolchain
 *      row exists for the same source+kind) and diff rows whose versions are gone.
 *   2. Sweep CasObjects not referenced by any remaining artifact/diff row.
 *
 * ponytail: O(rows) in-memory scan — fine at conference scale; batch/stream by
 * (sourceSha256,kind) if the artifact table ever grows past memory.
 */
export async function reapCasObjects(now = Date.now()): Promise<ReapResult> {
	const cutoff = new Date(now - GRACE_MS);

	const artifacts = await prisma.submissionVersionArtifact.findMany({
		select: { id: true, sourceSha256: true, kind: true, createdAt: true },
		orderBy: { createdAt: "desc" },
	});
	const supersededIds = selectSupersededIds(artifacts, cutoff);
	// deleteMany with an empty `in` list is a safe no-op, so no length guard.
	await prisma.submissionVersionArtifact.deleteMany({
		where: { id: { in: supersededIds } },
	});

	const diffs = await prisma.versionDiffArtifact.findMany({
		where: { createdAt: { lt: cutoff } },
		select: { id: true, oldVersionId: true, newVersionId: true },
	});
	const referencedVersionIds = [
		...new Set(diffs.flatMap((d) => [d.oldVersionId, d.newVersionId])),
	];
	const existingVersionIds = new Set(
		(
			await prisma.submissionVersion.findMany({
				where: { id: { in: referencedVersionIds } },
				select: { id: true },
			})
		).map((v) => v.id),
	);
	const danglingIds = selectDanglingDiffIds(diffs, existingVersionIds);
	await prisma.versionDiffArtifact.deleteMany({
		where: { id: { in: danglingIds } },
	});

	const [liveArtifacts, liveDiffs] = await Promise.all([
		prisma.submissionVersionArtifact.findMany({
			select: { htmlKey: true, figureShas: true },
		}),
		prisma.versionDiffArtifact.findMany({ select: { redlineKey: true } }),
	]);
	const live = computeLiveKeys(liveArtifacts, liveDiffs, figureKey);

	const objects = await prisma.casObject.findMany({
		where: { createdAt: { lt: cutoff } },
		select: { key: true },
	});
	const sweptObjects = await sweepOrphans(objects, live);

	return {
		supersededArtifacts: supersededIds.length,
		danglingDiffs: danglingIds.length,
		sweptObjects,
	};
}

async function sweepOrphans(
	objects: { key: string }[],
	live: Set<string>,
): Promise<number> {
	let swept = 0;
	for (const obj of objects) {
		if (live.has(obj.key)) continue;
		await deleteFile(obj.key).catch((err) => {
			logger.error(`[cas:reaper] deleteFile ${obj.key} failed: ${err}`);
		});
		await prisma.casObject.delete({ where: { key: obj.key } }).catch(() => {});
		swept++;
	}
	return swept;
}
