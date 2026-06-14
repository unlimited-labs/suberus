import { env } from "@/env";
import { createHealthCache } from "@/shared/lib/health-cache";

export interface LlmHealthResult {
	status: "healthy" | "unavailable";
	message: string;
	/** true = GPU detected, false = CPU only, undefined = unknown */
	gpu?: boolean;
	models?: string[];
}

const healthCache = createHealthCache<LlmHealthResult>(60_000);

export async function checkLlmHealth(): Promise<LlmHealthResult> {
	if (!env.LLM_API_URL) {
		return { status: "unavailable", message: "LLM_API_URL not configured" };
	}

	const cached = healthCache.get();
	if (cached) return cached;

	let result: LlmHealthResult;

	try {
		const headers: Record<string, string> = {};
		if (env.LLM_API_KEY) {
			headers.Authorization = `Bearer ${env.LLM_API_KEY}`;
		}

		const response = await fetch(`${env.LLM_API_URL}/models`, {
			headers,
			signal: AbortSignal.timeout(5_000),
		});

		if (!response.ok) {
			result = {
				status: "unavailable",
				message: `LLM API returned ${response.status}`,
			};
		} else {
			const data = (await response.json()) as {
				models?: { name: string }[];
				data?: { id: string }[];
			};
			const models =
				data.data?.map((m) => m.id) ?? data.models?.map((m) => m.name) ?? [];

			const missing: string[] = [];
			if (env.LLM_MODEL && !models.includes(env.LLM_MODEL)) {
				missing.push(`LLM_MODEL='${env.LLM_MODEL}'`);
			}
			if (
				env.LLM_EMBEDDING_MODEL &&
				!models.includes(env.LLM_EMBEDDING_MODEL)
			) {
				missing.push(`LLM_EMBEDDING_MODEL='${env.LLM_EMBEDDING_MODEL}'`);
			}

			if (missing.length > 0) {
				result = {
					status: "unavailable",
					message: `Configured model not reported by API: ${missing.join(", ")}. Available: ${models.join(", ") || "(none)"}`,
					models,
				};
			} else {
				result = { status: "healthy", message: "Connected", models };
				result.gpu = await detectGpu();
			}
		}
	} catch {
		result = {
			status: "unavailable",
			message: "Cannot reach LLM API",
		};
	}

	healthCache.set(result);
	return result;
}

async function detectGpu(): Promise<boolean | undefined> {
	const ollamaBase = env.LLM_API_URL?.replace(/\/v1\/?$/, "");
	if (!ollamaBase) return undefined;

	try {
		const res = await fetch(`${ollamaBase}/api/ps`, {
			signal: AbortSignal.timeout(2_000),
		});
		if (!res.ok) return undefined;

		const ps = (await res.json()) as {
			models?: { size_vram?: number }[];
		};
		if (ps.models && ps.models.length > 0) {
			return ps.models.some((m) => m.size_vram != null && m.size_vram > 0);
		}
	} catch {
		// Not Ollama — GPU detection unavailable
	}
	return undefined;
}

interface GenerateOptions {
	system: string;
	user: string;
	maxTokens?: number;
	timeoutMs?: number;
}

export async function generateWithLlm({
	system,
	user,
	maxTokens = 512,
	timeoutMs = 60_000,
}: GenerateOptions): Promise<string> {
	if (!env.LLM_API_URL) {
		throw new Error("LLM_API_URL not configured");
	}

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (env.LLM_API_KEY) {
		headers.Authorization = `Bearer ${env.LLM_API_KEY}`;
	}

	const url = `${env.LLM_API_URL}/chat/completions`;
	const model = env.LLM_MODEL || "phi3:mini";

	let response: Response;
	try {
		response = await fetch(url, {
			method: "POST",
			headers,
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: system },
					{ role: "user", content: user },
				],
				temperature: 0,
				max_tokens: maxTokens,
				stop: ["\n\n"],
				chat_template_kwargs: { enable_thinking: false },
			}),
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch (e) {
		throw new Error(
			`LLM request failed (${url}, model=${model}): ${describeFetchError(e, timeoutMs)}`,
			{ cause: e },
		);
	}

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`LLM API ${response.status} ${response.statusText} at ${url}${
				body ? `: ${body.slice(0, 300)}` : ""
			}`,
		);
	}

	const data = (await response.json()) as {
		choices: { message: { content: string } }[];
	};
	return data.choices[0]?.message.content || "";
}

function describeFetchError(e: unknown, timeoutMs: number): string {
	if (e instanceof Error) {
		if (e.name === "TimeoutError" || e.name === "AbortError") {
			return `timed out after ${timeoutMs}ms`;
		}
		const cause = (e as { cause?: unknown }).cause;
		const causeMsg =
			cause instanceof Error
				? `${cause.name}: ${cause.message}${
						"code" in cause && cause.code ? ` (${cause.code})` : ""
					}`
				: cause
					? String(cause)
					: "";
		return causeMsg ? `${e.message} — ${causeMsg}` : e.message;
	}
	return String(e);
}
