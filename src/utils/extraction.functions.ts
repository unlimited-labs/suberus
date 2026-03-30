import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { LlmHealthResult } from "@/lib/server/llm";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import { getSetting, setSetting } from "./settings.server";

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

export const extractDocumentMetadataFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({
			fileBase64: z.string(),
			fileName: z.string(),
		}),
	)
	.handler(async ({ data }) => {
		const { extractFromDocx } = await import("@/lib/server/extraction");
		const [heuristic, ai] = await Promise.all([
			getSetting("EXTRACTION_HEURISTIC"),
			getSetting("EXTRACTION_AI"),
		]);
		const buffer = Buffer.from(data.fileBase64, "base64");
		return extractFromDocx(buffer, { heuristic, ai }, data.fileName);
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

export const checkLlmHealthFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async (): Promise<LlmHealthResult> => {
		const { checkLlmHealth } = await import("@/lib/server/llm");
		return checkLlmHealth();
	});

export const llmHealthQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "llm-health"],
		queryFn: () => checkLlmHealthFn(),
	});
