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
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";

const MAX_VERIFY_BYTES = 25 * 1024 * 1024;

// Read = admin or editor (they see signing status on the documents page); all
// mutations below stay admin-only.
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
	.validator(
		z.object({
			commonName: z.string().trim().min(1).max(120),
			org: z.string().trim().max(120).default(""),
			validDays: z.number().int().min(30).max(3650).default(1825),
		}),
	)
	.handler(({ data }) => generateAndStoreCert(data));

export const uploadSigningCertFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator((data: FormData) => ({
		file: getUploadedFile(data, "p12"),
		password: String(data.get("password") ?? ""),
	}))
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
	.validator(
		z.object({
			enabled: z.boolean(),
			// Flows to the sidecar's HTTPTimeStamper → outbound request. Restrict to
			// http(s) so it can't be pointed at file:// or other schemes (SSRF).
			url: z
				.string()
				.trim()
				.max(300)
				.refine((u) => u === "" || /^https?:\/\//i.test(u), {
					message: "Timestamp URL must be an http(s) URL.",
				}),
		}),
	)
	.handler(({ data }) => setTimestamp(data.enabled, data.url));

export const setSigningAppearanceFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(
		z.object({
			sealReason: z.string().trim().max(120),
			sealCorner: z.enum([
				"bottom-right",
				"bottom-left",
				"top-right",
				"top-left",
			]),
			sealQrEnabled: z.boolean(),
			certifying: z.boolean(),
		}),
	)
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
