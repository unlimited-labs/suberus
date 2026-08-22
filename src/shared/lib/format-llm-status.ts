// Structural health shapes (kept minimal so this isomorphic formatter has no
// feature dependency). Compatible with settings' SERVICE_HEALTH_* entries.
interface LlmHealth {
	status: "healthy" | "unavailable" | "misconfigured";
	message?: string;
	gpu?: boolean;
	models?: string[];
	model?: string;
}
interface PdfApiHealthInfo {
	status: "healthy" | "unavailable";
}

export function formatLlmStatus(health: LlmHealth): string {
	if (health.status !== "healthy") return health.message ?? "LLM unavailable";

	const parts = ["LLM connected"];
	if (health.gpu === true) parts.push("GPU");
	else if (health.gpu === false) parts.push("CPU");
	if (health.model) parts.push(health.model);

	return parts.join(" · ");
}

export function formatPdfApiStatus(health: PdfApiHealthInfo): string {
	if (health.status !== "healthy") return "PDF API unavailable";
	return "PDF API connected";
}
