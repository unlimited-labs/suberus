import AdmZip from "adm-zip";
import {
	baseNameOf,
	documentUserIdFromEntry,
	isIgnoredZipEntry,
} from "@/features/documents/server/bulk-upload-match";
import {
	attachUploadedDocument,
	MAX_DOCUMENT_BYTES,
} from "@/features/documents/server/upload";
import type { DocumentDelivery } from "@/features/documents/validations";
import { prisma } from "@/shared/server/db.server";
import { UploadValidationError } from "@/shared/server/validate-upload";

export const MAX_IMPORT_ZIP_BYTES = 200 * 1024 * 1024;

export type ImportSkipReason =
	| "no-user-id"
	| "unknown-user"
	| "invalid-file"
	| "too-large"
	| "failed";

export interface ImportDocumentsResult {
	batchId: string;
	uploaded: number;
	skipped: { name: string; reason: ImportSkipReason; error?: string }[];
}

export async function importDocumentsZip(
	opts: DocumentDelivery & {
		zipBuffer: Buffer;
		title: string;
		createdById: string;
	},
): Promise<ImportDocumentsResult> {
	if (opts.zipBuffer.length > MAX_IMPORT_ZIP_BYTES) {
		throw new UploadValidationError(
			`The archive exceeds the ${Math.round(MAX_IMPORT_ZIP_BYTES / (1024 * 1024))}MB limit.`,
		);
	}
	const title = opts.title.trim();
	if (!title) throw new Error("A document title is required.");

	const entries = new AdmZip(opts.zipBuffer)
		.getEntries()
		.filter(
			(e) => !e.isDirectory && !isIgnoredZipEntry(baseNameOf(e.entryName)),
		);

	const batch = await prisma.documentBatch.create({
		data: {
			name: title,
			total: entries.length,
			createdById: opts.createdById,
		},
		select: { id: true },
	});

	const ids = entries
		.map((e) => documentUserIdFromEntry(e.entryName))
		.filter((id): id is string => id !== null);
	const known = new Set(
		(
			await prisma.user.findMany({
				where: { id: { in: ids } },
				select: { id: true },
			})
		).map((u) => u.id),
	);

	const skipped: ImportDocumentsResult["skipped"] = [];
	let uploaded = 0;

	for (const entry of entries) {
		const name = entry.entryName;
		const userId = documentUserIdFromEntry(name);
		if (!userId) {
			skipped.push({ name, reason: "no-user-id" });
			continue;
		}
		if (!known.has(userId)) {
			skipped.push({ name, reason: "unknown-user" });
			continue;
		}
		// Decompressing first would let one crafted entry exhaust memory.
		if (entry.header.size > MAX_DOCUMENT_BYTES) {
			skipped.push({ name, reason: "too-large" });
			continue;
		}
		try {
			await attachUploadedDocument({
				userId,
				title,
				sign: opts.sign,
				sealVisible: opts.sealVisible,
				notify: opts.notify,
				buffer: entry.getData(),
				createdById: opts.createdById,
				batchId: batch.id,
			});
			uploaded++;
		} catch (error) {
			if (error instanceof UploadValidationError) {
				skipped.push({ name, reason: "invalid-file", error: error.message });
				continue;
			}
			// unreported — the operator needs the list to retry from.
			skipped.push({
				name,
				reason: "failed",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	await prisma.documentBatch.update({
		where: { id: batch.id },
		data: { total: uploaded },
	});

	return { batchId: batch.id, uploaded, skipped };
}
