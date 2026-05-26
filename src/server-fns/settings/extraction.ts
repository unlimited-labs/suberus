import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ExtractionResult } from "@/lib/server/extraction";
import { createJobProgress, getJobProgress } from "@/lib/server/job-progress";
import { adminMiddleware, authMiddleware } from "@/lib/server/middleware/auth";
import { getBoss } from "@/lib/server/queue";
import { getSetting, setSetting } from "@/lib/server/settings";
import { generateExtractionFileKey, uploadFile } from "@/lib/server/storage";
import type { AppSettingsMap } from "@/lib/settings/types";

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
	.inputValidator(
		z.object({
			fileBase64: z.string(),
			fileName: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		const [heuristic, ai] = await Promise.all([
			getSetting("EXTRACTION_HEURISTIC"),
			getSetting("EXTRACTION_AI"),
		]);

		const jobId = await createJobProgress("extraction");
		const buffer = Buffer.from(data.fileBase64, "base64");
		const storageKey = generateExtractionFileKey(jobId, data.fileName);
		await uploadFile(buffer, storageKey, "application/octet-stream");

		const boss = await getBoss();
		await boss.send("extraction", {
			jobId,
			storageKey,
			fileName: data.fileName,
			heuristic,
			ai,
		});

		return { jobId };
	});

export const getExtractionResultFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator(z.object({ jobId: z.string().uuid() }))
	.handler(async ({ data }) => {
		const job = await getJobProgress(data.jobId);
		if (!job) return { notFound: true as const };

		return {
			notFound: false as const,
			status: job.status,
			error: job.error,
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
	.inputValidator(
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

export const getDoclingHealthFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(
		async (): Promise<AppSettingsMap["SERVICE_HEALTH_DOCLING"]> =>
			getSetting("SERVICE_HEALTH_DOCLING"),
	);

export const doclingHealthQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "docling-health"],
		queryFn: () => getDoclingHealthFn(),
		refetchInterval: 5 * 60_000,
	});
