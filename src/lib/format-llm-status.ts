import type { LlmHealthResult } from "@/lib/server/llm";

export function formatLlmStatus(health: LlmHealthResult): string {
	if (health.status !== "healthy") return "LLM unavailable";

	const parts = ["LLM connected"];
	if (health.gpu === true) parts.push("GPU");
	else if (health.gpu === false) parts.push("CPU");
	if (health.models?.length) parts.push(health.models.join(", "));

	return parts.join(" · ");
}

export function pluralize(
	count: number,
	singular: string,
	plural?: string,
): string {
	return count === 1 ? singular : (plural ?? `${singular}s`);
}
