import { z } from "zod";
import { SignMode } from "@/generated/prisma/enums";

export const MAX_DOCUMENT_TITLE_LENGTH = 200;

export const documentDeliverySchema = z.object({
	signMode: z.enum(SignMode).default(SignMode.VISIBLE),
	notify: z.boolean().default(true),
});

export type DocumentDelivery = z.infer<typeof documentDeliverySchema>;

export const uploadedDocumentMetaSchema = z.object({
	userId: z.uuid(),
	title: z.string().trim().min(1).max(MAX_DOCUMENT_TITLE_LENGTH),
	...documentDeliverySchema.shape,
});

export type UploadedDocumentMeta = z.infer<typeof uploadedDocumentMetaSchema>;

export const uploadedDocumentTokenSchema = uploadedDocumentMetaSchema.extend({
	by: z.uuid(),
});

export type UploadedDocumentToken = z.infer<typeof uploadedDocumentTokenSchema>;
