import { z } from "zod";

export const MAX_DOCUMENT_TITLE_LENGTH = 200;

export const uploadedDocumentMetaSchema = z.object({
	userId: z.uuid(),
	title: z.string().trim().min(1).max(MAX_DOCUMENT_TITLE_LENGTH),
	sign: z.boolean().default(true),
	sealVisible: z.boolean().default(true),
	notify: z.boolean().default(true),
});

export type UploadedDocumentMeta = z.infer<typeof uploadedDocumentMetaSchema>;

export type DocumentDelivery = Pick<
	UploadedDocumentMeta,
	"sign" | "sealVisible" | "notify"
>;

export const uploadedDocumentTokenSchema = uploadedDocumentMetaSchema.extend({
	by: z.uuid(),
});

export type UploadedDocumentToken = z.infer<typeof uploadedDocumentTokenSchema>;
