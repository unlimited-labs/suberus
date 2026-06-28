import { activityDetail } from "@/features/activity-log/types";
import {
	createGeneratedDocument,
	DOCUMENT_GENERATE_QUEUE,
} from "@/features/documents/server/generate";
import { resolvePlaceholders } from "@/features/documents/server/resolve";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/server/db.server";
import { ensureQueueAndSend } from "@/shared/server/queue";

const ENQUEUE_OPTS = { retryLimit: 2, retryDelay: 30, expireInSeconds: 600 };

function displayName(u: {
	firstName: string | null;
	lastName: string | null;
	email: string;
}): string {
	return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

export interface BulkSkip {
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
	for (const u of users) {
		const { missing } = await resolvePlaceholders(u.id);
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
	for (const d of docs) {
		await ensureQueueAndSend(
			DOCUMENT_GENERATE_QUEUE,
			{ documentId: d.id },
			ENQUEUE_OPTS,
		);
	}

	return { batchId: batch.id, total: docs.length };
}

// Re-export so callers needing a single generation use the same module surface.
export { createGeneratedDocument };

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
