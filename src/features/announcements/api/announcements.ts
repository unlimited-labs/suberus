import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	createAnnouncementFromSheet,
	createDraftAnnouncement,
	deleteAnnouncement,
	getAnnouncement,
	listAnnouncements,
	placeholderIssues,
	publishAnnouncement,
	saveAnnouncementDraft,
} from "@/features/announcements/server/announcements";
import {
	getMyAnnouncement,
	listMyAnnouncements,
	markAnnouncementRead,
} from "@/features/announcements/server/inbox";
import {
	getRecipientDraft,
	listUserAnnouncements,
	updateAnnouncementRecipient,
} from "@/features/announcements/server/recipient";
import {
	announcementCheckInput,
	announcementCreateInput,
	announcementDraftInput,
	announcementIdInput,
	announcementRecipientIdInput,
	recipientUpdateInput,
	sheetAnnouncementCreateInput,
} from "@/features/announcements/validations";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import { sheetMatchInput } from "@/shared/lib/sheet-mapping";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";
import { matchSheetRows } from "@/shared/server/sheet-match";
import { parseSheetBuffer } from "@/shared/server/sheet-parse";
import { validateUpload } from "@/shared/server/validate-upload";

export const createAnnouncementDraft = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(announcementCreateInput)
	.handler(async ({ data, context }) => {
		return createDraftAnnouncement(data.userIds, context.user.id);
	});

export const getAnnouncementById = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(announcementIdInput)
	.handler(async ({ data }) => getAnnouncement(data.id));

export const listAnnouncementsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => listAnnouncements());

export const saveAnnouncementDraftFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(announcementDraftInput)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await saveAnnouncementDraft(id, rest);
		return { ok: true as const };
	});

export const publishAnnouncementFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(announcementIdInput)
	.handler(async ({ data }) => publishAnnouncement(data.id));

export const deleteAnnouncementFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(announcementIdInput)
	.handler(async ({ data }) => {
		await deleteAnnouncement(data.id);
		return { ok: true as const };
	});

export const checkAnnouncementPlaceholders = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(announcementCheckInput)
	.handler(async ({ data }) => placeholderIssues(data.id, data.tokens));

// A legacy .xls is a CFB container, which is all file-type can tell us; a
// non-workbook that reaches parseSheetBuffer is rejected there.
const SHEET_EXTENSIONS = ["xlsx", "cfb"] as const;
const MAX_SHEET_BYTES = 5 * 1024 * 1024;

export const parseAnnouncementSheet = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		const buffer = await fileToBuffer(data.file);
		await validateUpload(buffer, {
			allowedExtensions: SHEET_EXTENSIONS,
			maxBytes: MAX_SHEET_BYTES,
		});
		return parseSheetBuffer(buffer);
	});

export const matchAnnouncementSheet = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(sheetMatchInput)
	.handler(async ({ data }) => matchSheetRows(data));

export const createAnnouncementDraftFromSheet = createServerFn({
	method: "POST",
})
	.middleware([adminMiddleware])
	.validator(sheetAnnouncementCreateInput)
	.handler(async ({ data, context }) =>
		createAnnouncementFromSheet(data, context.user.id),
	);

export const listUserAnnouncementsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ userId: z.uuid() }))
	.handler(async ({ data }) => listUserAnnouncements(data.userId));

export const getAnnouncementRecipientDraft = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(announcementRecipientIdInput)
	.handler(async ({ data }) => getRecipientDraft(data.recipientId));

export const updateAnnouncementRecipientFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(recipientUpdateInput)
	.handler(async ({ data }) => {
		await updateAnnouncementRecipient(data);
		return { ok: true as const };
	});

export const listMyAnnouncementsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => listMyAnnouncements(context.user.id));

export const getMyAnnouncementFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(announcementRecipientIdInput)
	.handler(async ({ data, context }) =>
		getMyAnnouncement({
			userId: context.user.id,
			recipientId: data.recipientId,
		}),
	);

export const markMyAnnouncementRead = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(announcementRecipientIdInput)
	.handler(async ({ data, context }) => {
		await markAnnouncementRead({
			userId: context.user.id,
			recipientId: data.recipientId,
		});
		return { ok: true as const };
	});

export const announcementQueryOptions = (id: string) =>
	queryOptions({
		queryKey: ["announcement", id],
		queryFn: () => getAnnouncementById({ data: { id } }),
	});

export const announcementsQueryOptions = () =>
	queryOptions({
		queryKey: ["announcements", "admin"],
		queryFn: () => listAnnouncementsFn(),
	});

export const announcementIssuesQueryOptions = (id: string, tokens: string[]) =>
	queryOptions({
		queryKey: ["announcement", id, "placeholders", tokens.toSorted()],
		queryFn: () => checkAnnouncementPlaceholders({ data: { id, tokens } }),
	});

export const myAnnouncementsQueryOptions = () =>
	queryOptions({
		queryKey: ["announcements", "mine"],
		queryFn: () => listMyAnnouncementsFn(),
	});

export const myAnnouncementQueryOptions = (recipientId: string) =>
	queryOptions({
		queryKey: ["announcements", "mine", recipientId],
		queryFn: () => getMyAnnouncementFn({ data: { recipientId } }),
	});

export const userAnnouncementsQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: ["announcements", "user", userId],
		queryFn: () => listUserAnnouncementsFn({ data: { userId } }),
	});

export const announcementRecipientDraftQueryOptions = (recipientId: string) =>
	queryOptions({
		queryKey: ["announcements", "recipient-draft", recipientId],
		queryFn: () => getAnnouncementRecipientDraft({ data: { recipientId } }),
	});
