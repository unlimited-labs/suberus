import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import {
	batchProgress,
	previewBulk,
	startBulk,
} from "@/features/documents/server/bulk";
import {
	adminListDocuments,
	adminListUserDocuments,
	countMyReadyDocuments,
	deleteDocument,
	listMyDocuments,
} from "@/features/documents/server/documents";
import {
	createGeneratedDocument,
	previewResolution,
} from "@/features/documents/server/generate";
import {
	createTemplate,
	deleteTemplate,
	listTemplates,
} from "@/features/documents/server/templates";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";

const documentStatus = z.enum(["PENDING", "READY", "FAILED"]);

export const listTemplatesFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(() => listTemplates());

export const documentKeys = { all: ["documents"] as const };

export const documentTemplatesQueryOptions = () =>
	queryOptions({
		queryKey: [...documentKeys.all, "templates"],
		queryFn: () => listTemplatesFn(),
	});

export const uploadTemplateFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator((data: FormData) => ({
		file: getUploadedFile(data),
		name: String(data.get("name") ?? ""),
		description: data.get("description")
			? String(data.get("description"))
			: null,
	}))
	.handler(async ({ data, context }) => {
		const buffer = await fileToBuffer(data.file);
		return createTemplate({
			file: data.file,
			buffer,
			name: data.name,
			description: data.description,
			createdById: context.user.id,
		});
	});

export const deleteTemplateFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteTemplate(data.id);
		return { success: true };
	});

export const previewResolutionFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ userId: z.uuid(), templateId: z.uuid() }))
	.handler(({ data }) => previewResolution(data.userId, data.templateId));

export const previewResolutionQueryOptions = (
	userId: string,
	templateId: string | null,
) =>
	queryOptions({
		queryKey: [...documentKeys.all, "preview", userId, templateId],
		queryFn: () =>
			previewResolutionFn({ data: { userId, templateId: templateId ?? "" } }),
		enabled: Boolean(templateId),
	});

export const generateDocumentFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			userId: z.uuid(),
			templateId: z.uuid(),
			name: z.string().max(200).optional(),
		}),
	)
	.handler(({ data, context }) =>
		createGeneratedDocument({
			userId: data.userId,
			templateId: data.templateId,
			name: data.name,
			generatedById: context.user.id,
		}),
	);

export const previewBulkFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({ templateId: z.uuid(), userIds: z.array(z.uuid()).min(1) }),
	)
	.handler(({ data }) => previewBulk(data.templateId, data.userIds));

export const startBulkFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			templateId: z.uuid(),
			userIds: z.array(z.uuid()).min(1),
			name: z.string().max(200).optional(),
		}),
	)
	.handler(({ data, context }) =>
		startBulk({
			templateId: data.templateId,
			userIds: data.userIds,
			name: data.name,
			createdById: context.user.id,
		}),
	);

export const batchProgressFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ batchId: z.uuid() }))
	.handler(({ data }) => batchProgress(data.batchId));

export const batchProgressQueryOptions = (batchId: string | null) =>
	queryOptions({
		queryKey: [...documentKeys.all, "batch", batchId],
		queryFn: () => batchProgressFn({ data: { batchId: batchId ?? "" } }),
		enabled: Boolean(batchId),
	});

export const adminListDocumentsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			search: z.string().optional(),
			status: documentStatus.optional(),
			templateId: z.uuid().optional(),
		}),
	)
	.handler(({ data }) => adminListDocuments(data));

export const adminDocumentsQueryOptions = (filters?: {
	search?: string;
	status?: "PENDING" | "READY" | "FAILED";
	templateId?: string;
}) =>
	queryOptions({
		queryKey: [...documentKeys.all, "all", filters ?? {}],
		queryFn: () => adminListDocumentsFn({ data: filters ?? {} }),
	});

export const adminUserDocumentsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ userId: z.uuid() }))
	.handler(({ data }) => adminListUserDocuments(data.userId));

export const adminUserDocumentsQueryOptions = (userId: string) =>
	queryOptions({
		queryKey: [...documentKeys.all, "user", userId],
		queryFn: () => adminUserDocumentsFn({ data: { userId } }),
	});

export const deleteDocumentFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data, context }) => {
		await deleteDocument(data.id, context.user.id);
		return { success: true };
	});

export const myDocumentsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => listMyDocuments(context.user.id));

export const myDocumentsQueryOptions = () =>
	queryOptions({
		queryKey: [...documentKeys.all, "mine"],
		queryFn: () => myDocumentsFn(),
	});

export const myDocumentsCountFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(({ context }) => countMyReadyDocuments(context.user.id));

export const myDocumentsCountQueryOptions = () =>
	queryOptions({
		queryKey: [...documentKeys.all, "mine", "count"],
		queryFn: () => myDocumentsCountFn(),
	});
