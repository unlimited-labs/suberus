import { activityDetail } from "@/features/activity-log/types";
import {
	DOCUMENT_GENERATE_QUEUE,
	ENQUEUE_OPTS,
	uploadedDocumentKey,
} from "@/features/documents/server/generate";
import { prisma } from "@/shared/server/db.server";
import { ensureQueueAndSend } from "@/shared/server/queue";
import { uploadFile } from "@/shared/server/storage";
import { validateUpload } from "@/shared/server/validate-upload";

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export interface AttachUploadedDocumentInput {
	userId: string;
	title: string;
	sign: boolean;
	notify: boolean;
	buffer: Buffer;
	createdById: string;
	batchId?: string;
}

/**
 * An externally-produced PDF filed against a participant: a `GeneratedDocument`
 * with no template, so it lists, downloads and deletes like a generated one.
 */
export async function attachUploadedDocument(
	input: AttachUploadedDocumentInput,
): Promise<{ id: string }> {
	await validateUpload(input.buffer, {
		allowedExtensions: ["pdf"],
		maxBytes: MAX_DOCUMENT_BYTES,
	});

	const title = input.title.trim();
	if (!title)
		throw new Response("A document title is required", { status: 400 });

	const user = await prisma.user.findUnique({
		where: { id: input.userId },
		select: { id: true },
	});
	if (!user) throw new Response("Participant not found", { status: 404 });

	const doc = await prisma.generatedDocument.create({
		data: {
			userId: user.id,
			templateId: null,
			batchId: input.batchId,
			name: title,
			generatedById: input.createdById,
			status: "PENDING",
		},
		select: { id: true },
	});

	await uploadFile(
		input.buffer,
		uploadedDocumentKey(doc.id),
		"application/pdf",
	);

	await prisma.activityLog.create({
		data: {
			type: "DOCUMENT_UPLOADED",
			userId: user.id,
			performedBy: input.createdById,
			detail: activityDetail("DOCUMENT_UPLOADED", { documentName: title }),
		},
	});

	await ensureQueueAndSend(
		DOCUMENT_GENERATE_QUEUE,
		{ documentId: doc.id, sign: input.sign, notify: input.notify },
		ENQUEUE_OPTS,
	);
	return doc;
}
