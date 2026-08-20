import { activityDetail } from "@/features/activity-log/types";
import {
	DOCUMENT_GENERATE_QUEUE,
	ENQUEUE_OPTS,
} from "@/features/documents/server/generate";
import {
	displayName,
	resolvePlaceholders,
} from "@/features/documents/server/resolve";
import { getSigningConfig } from "@/features/settings/server/document-signing";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/server/db.server";
import { ensureQueueAndSend } from "@/shared/server/queue";

interface BulkSkip {
	userId: string;
	name: string;
	missing: string[];
}

export interface BulkPreview {
	templateName: string;
	resolvableIds: string[];
	skipped: BulkSkip[];
}

/**
 * For each selected participant, decide if every placeholder the template uses
 * can be resolved. Lets the operator see who would be skipped (missing data)
 * before committing. O(n) per-user resolves — fine for manual selection scale.
 */
export async function previewBulk(
	templateId: string,
	userIds: string[],
): Promise<BulkPreview> {
	const template = await prisma.documentTemplate.findUnique({
		where: { id: templateId },
	});
	if (!template) throw new Error("Template not found.");

	const users = await prisma.user.findMany({
		where: { id: { in: userIds } },
		select: { id: true, firstName: true, lastName: true, email: true },
	});

	const resolvableIds: string[] = [];
	const skipped: BulkSkip[] = [];
	const resolved = await Promise.all(
		users.map(async (u) => ({
			u,
			missing: (await resolvePlaceholders(u.id)).missing,
		})),
	);
	for (const { u, missing } of resolved) {
		const missingSet = new Set<string>(missing);
		const blocked = template.placeholders.filter((p) => missingSet.has(p));
		if (blocked.length > 0) {
			skipped.push({ userId: u.id, name: displayName(u), missing: blocked });
		} else {
			resolvableIds.push(u.id);
		}
	}
	return { templateName: template.name, resolvableIds, skipped };
}

/**
 * Create a batch of PENDING rows (resolvable users only) and enqueue one render
 * job each. Progress is derived from the rows' statuses ({@link batchProgress}).
 */
export async function startBulk(opts: {
	templateId: string;
	userIds: string[];
	name?: string;
	createdById: string;
}): Promise<{ batchId: string; total: number }> {
	const template = await prisma.documentTemplate.findUnique({
		where: { id: opts.templateId },
	});
	if (!template) throw new Error("Template not found.");

	const { resolvableIds } = await previewBulk(opts.templateId, opts.userIds);
	if (resolvableIds.length === 0) {
		throw new Error(
			"None of the selected participants have all required data.",
		);
	}

	const batch = await prisma.documentBatch.create({
		data: {
			templateId: template.id,
			name: opts.name?.trim() || null,
			total: resolvableIds.length,
			createdById: opts.createdById,
		},
		select: { id: true },
	});

	await prisma.generatedDocument.createMany({
		data: resolvableIds.map((userId) => ({
			userId,
			templateId: template.id,
			batchId: batch.id,
			name: template.name,
			generatedById: opts.createdById,
			status: "PENDING" as const,
		})),
	});

	// SAFETY: activityDetail() builds a plain JSON object.
	await prisma.activityLog.createMany({
		data: resolvableIds.map((userId) => ({
			type: "DOCUMENT_GENERATED" as const,
			userId,
			performedBy: opts.createdById,
			detail: activityDetail("DOCUMENT_GENERATED", {
				documentName: template.name,
				templateName: template.name,
			}) as Prisma.InputJsonValue,
		})),
	});

	const docs = await prisma.generatedDocument.findMany({
		where: { batchId: batch.id },
		select: { id: true },
	});
	await Promise.all(
		docs.map((d) =>
			ensureQueueAndSend(
				DOCUMENT_GENERATE_QUEUE,
				{ documentId: d.id },
				ENQUEUE_OPTS,
			),
		),
	);

	return { batchId: batch.id, total: docs.length };
}

/**
 * After a certificate rotation, every previously-signed document was signed with
 * the now-replaced cert, so it no longer matches the conference's current cert on
 * the public verifier. Reset each signed doc to PENDING and re-enqueue it by id:
 * the worker re-renders from the template and re-signs with the CURRENT cert,
 * overwriting the same (deterministic) storage key — so no orphan rows are left.
 * No-op unless signing is currently enabled (re-rendering with signing off would
 * silently strip signatures and re-notify participants for nothing).
 */
export async function resignSignedDocuments(): Promise<{ count: number }> {
	const signing = await getSigningConfig();
	if (!signing?.enabled) return { count: 0 };

	const docs = await prisma.generatedDocument.findMany({
		where: { signed: true },
		select: { id: true },
	});
	if (docs.length === 0) return { count: 0 };

	await prisma.generatedDocument.updateMany({
		where: { id: { in: docs.map((d) => d.id) } },
		data: { status: "PENDING", signed: false, error: null },
	});
	await Promise.all(
		docs.map((d) =>
			ensureQueueAndSend(
				DOCUMENT_GENERATE_QUEUE,
				{ documentId: d.id },
				ENQUEUE_OPTS,
			),
		),
	);
	return { count: docs.length };
}

export interface BatchProgress {
	total: number;
	pending: number;
	ready: number;
	failed: number;
	failures: {
		id: string;
		name: string;
		participant: string;
		error: string | null;
	}[];
}

export async function batchProgress(batchId: string): Promise<BatchProgress> {
	const grouped = await prisma.generatedDocument.groupBy({
		by: ["status"],
		where: { batchId },
		_count: { _all: true },
	});
	const counts = { PENDING: 0, READY: 0, FAILED: 0 };
	for (const g of grouped) counts[g.status] = g._count._all;

	const failures = await prisma.generatedDocument.findMany({
		where: { batchId, status: "FAILED" },
		select: {
			id: true,
			name: true,
			error: true,
			user: { select: { firstName: true, lastName: true, email: true } },
		},
	});

	return {
		total: counts.PENDING + counts.READY + counts.FAILED,
		pending: counts.PENDING,
		ready: counts.READY,
		failed: counts.FAILED,
		failures: failures.map((f) => ({
			id: f.id,
			name: f.name,
			participant: displayName(f.user),
			error: f.error,
		})),
	};
}
