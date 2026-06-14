import type { AppSettingsMap } from "@/features/settings/types";

type LlmHealth = AppSettingsMap["SERVICE_HEALTH_LLM"];
type DoclingHealth = AppSettingsMap["SERVICE_HEALTH_DOCLING"];

export function formatLlmStatus(health: LlmHealth): string {
	if (health.status !== "healthy") return "LLM unavailable";

	const parts = ["LLM connected"];
	if (health.gpu === true) parts.push("GPU");
	else if (health.gpu === false) parts.push("CPU");
	if (health.models?.length) parts.push(health.models.join(", "));

	return parts.join(" · ");
}

export function formatDoclingStatus(health: DoclingHealth): string {
	if (health.status !== "healthy") return "Docling unavailable";
	return "Docling connected";
}

export function pluralize(
	count: number,
	singular: string,
	plural?: string,
): string {
	return count === 1 ? singular : (plural ?? `${singular}s`);
}
