import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	adminOnlyMiddleware,
} from "@/features/auth/server/middleware";
import {
	generateAndStoreCert,
	getSigningConfig,
	sanitize,
	setAppearance,
	setEnabled,
	setTimestamp,
	uploadAndStoreCert,
	verifyDocument,
} from "@/features/settings/server/document-signing";
import {
	signingAppearanceSchema,
	signingCertGenerateSchema,
	signingCertUploadSchema,
	signingTimestampSchema,
} from "@/features/settings/validations";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";

const MAX_VERIFY_BYTES = 25 * 1024 * 1024;

export const getDocumentSigningFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => sanitize(await getSigningConfig()));

export const documentSigningQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "document-signing"],
		queryFn: () => getDocumentSigningFn(),
	});

export const generateSigningCertFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(signingCertGenerateSchema)
	.handler(({ data }) => generateAndStoreCert(data));

export const uploadSigningCertFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator((data: FormData) =>
		signingCertUploadSchema.parse({
			file: getUploadedFile(data, "p12"),
			password: String(data.get("password") ?? ""),
		}),
	)
	.handler(async ({ data }) => {
		const buffer = await fileToBuffer(data.file);
		return uploadAndStoreCert(buffer, data.password);
	});

export const setSigningEnabledFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ enabled: z.boolean() }))
	.handler(({ data }) => setEnabled(data.enabled));

export const setSigningTimestampFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(signingTimestampSchema)
	.handler(({ data }) => setTimestamp(data.enabled, data.url));

export const setSigningAppearanceFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(signingAppearanceSchema)
	.handler(({ data }) => setAppearance(data));

/** Public: anyone can verify a document's authenticity (the trust anchor). */
export const verifyDocumentFn = createServerFn({ method: "POST" })
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data }) => {
		const buffer = await fileToBuffer(data.file);
		if (buffer.length > MAX_VERIFY_BYTES) {
			throw new Error("File exceeds the 25MB limit.");
		}
		return verifyDocument(buffer);
	});
