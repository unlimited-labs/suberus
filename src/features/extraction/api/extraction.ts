import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import type { ExtractionResult } from "@/features/extraction/server/extraction";
import { enqueueExtractionJob } from "@/features/extraction/server/extraction-queue";
import { getSetting, setSetting } from "@/features/settings/server/settings";
import type { AppSettingsMap } from "@/features/settings/types";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";
import { getJobProgress } from "@/shared/server/job-progress";

// --- Public (auth-required) ---

export interface ExtractionSettings {
	enabled: boolean;
	heuristic: boolean;
	ai: boolean;
}

export const getExtractionSettingsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async (): Promise<ExtractionSettings> => {
		const [enabled, heuristic, ai] = await Promise.all([
			getSetting("EXTRACTION_ENABLED"),
			getSetting("EXTRACTION_HEURISTIC"),
			getSetting("EXTRACTION_AI"),
		]);
		return { enabled, heuristic, ai };
	});

export const extractionSettingsQueryOptions = () =>
	queryOptions({
		queryKey: ["settings", "extraction"],
		queryFn: () => getExtractionSettingsFn(),
	});

export const enqueueExtractionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator((data: FormData) => ({ file: getUploadedFile(data) }))
	.handler(async ({ data, context }) => {
		const buffer = await fileToBuffer(data.file);
		return enqueueExtractionJob(buffer, data.file.name, context.user.id);
	});

export const getExtractionResultFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(z.object({ jobId: z.uuid() }))
	.handler(async ({ data }) => {
		const job = await getJobProgress(data.jobId);
		if (!job) return { notFound: true as const };

		return {
			notFound: false as const,
			status: job.status,
			error: job.error,
			// SAFETY: this job's worker writes an ExtractionResult.
			result: (job.result as ExtractionResult | null) ?? null,
		};
	});

// --- Admin ---

export const getExtractionAdminSettingsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async (): Promise<ExtractionSettings> => {
		const [enabled, heuristic, ai] = await Promise.all([
			getSetting("EXTRACTION_ENABLED"),
			getSetting("EXTRACTION_HEURISTIC"),
			getSetting("EXTRACTION_AI"),
		]);
		return { enabled, heuristic, ai };
	});

export const extractionAdminSettingsQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "extraction-settings"],
		queryFn: () => getExtractionAdminSettingsFn(),
	});

export const updateExtractionSettingsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			enabled: z.boolean(),
			heuristic: z.boolean(),
			ai: z.boolean(),
		}),
	)
	.handler(async ({ data }) => {
		await Promise.all([
			setSetting("EXTRACTION_ENABLED", data.enabled),
			setSetting("EXTRACTION_HEURISTIC", data.heuristic),
			setSetting("EXTRACTION_AI", data.ai),
		]);
	});

export const getLlmHealthFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(
		async (): Promise<AppSettingsMap["SERVICE_HEALTH_LLM"]> =>
			getSetting("SERVICE_HEALTH_LLM"),
	);

export const llmHealthQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "llm-health"],
		queryFn: () => getLlmHealthFn(),
		refetchInterval: 5 * 60_000,
	});

export const getPdfApiHealthFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(
		async (): Promise<AppSettingsMap["SERVICE_HEALTH_PDF_API"]> =>
			getSetting("SERVICE_HEALTH_PDF_API"),
	);

export const pdfApiHealthQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "pdf-api-health"],
		queryFn: () => getPdfApiHealthFn(),
		refetchInterval: 5 * 60_000,
	});
