import { z } from "zod";
import {
	dataMappingTargetSchema,
	refineSheetCreate,
	sheetCreateShape,
} from "@/shared/lib/sheet-mapping";

export const announcementIdInput = z.object({ id: z.uuid() });

export const announcementRecipientIdInput = z.object({
	recipientId: z.uuid(),
});

export const announcementCreateInput = z.object({
	userIds: z.array(z.uuid()).min(1, "No recipients selected"),
});

export const announcementDraftInput = z.object({
	id: z.uuid(),
	subject: z.string(),
	bodySource: z.string(),
});

export const announcementCheckInput = announcementIdInput.extend({
	tokens: z.array(z.string()).max(100),
});

export const recipientUpdateInput = z.object({
	recipientId: z.uuid(),
	subject: z.string().min(1, "Subject is required"),
	bodySource: z.string().min(1, "Body is required"),
});

// No firstName/lastName targets: every recipient already has an account and the
// account's own name wins, so a builtin mapping would be silently dropped.
export const sheetAnnouncementCreateInput = sheetCreateShape
	.omit({ unmatched: true, mapping: true })
	.extend({
		mapping: z.array(
			z.object({
				column: z.number().int().min(0),
				target: dataMappingTargetSchema,
			}),
		),
	})
	.superRefine(refineSheetCreate);

export type SheetAnnouncementCreateInput = z.infer<
	typeof sheetAnnouncementCreateInput
>;
