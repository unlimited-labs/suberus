import { z } from "zod";

const issueArraySchema = z
	.array(
		z.object({
			path: z.array(z.union([z.string(), z.number()])),
			message: z.string(),
		}),
	)
	.min(1);

/**
 * Attempts to extract a human-readable message from a thrown value when it
 * carries serialized Zod issues (e.g. TanStack `inputValidator` failures that
 * surface on the client as `Error` with a JSON-encoded message). Returns the
 * first issue formatted as `"<path>: <message>"` or `null` if not recognised.
 */
export function extractZodIssueMessage(e: unknown): string | null {
	const raw = e instanceof Error ? e.message : z.string().safeParse(e).data;
	if (!raw) return null;
	const trimmed = raw.trim();
	if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return null;
	}
	const issues = issueArraySchema.safeParse(parsed);
	if (!issues.success) return null;
	const first = issues.data[0];
	const path = first.path.join(".");
	return path ? `${path}: ${first.message}` : first.message;
}

/** Stringifies an unknown thrown value with useful structure for browser devtools. */
export async function logClientError(label: string, e: unknown): Promise<void> {
	if (e instanceof Response) {
		let body = "";
		try {
			body = await e.clone().text();
		} catch {
			body = "<unreadable body>";
		}
		console.error(label, {
			kind: "Response",
			status: e.status,
			statusText: e.statusText,
			url: e.url,
			body: body.slice(0, 2000),
		});
		return;
	}
	if (e instanceof Error) {
		console.error(label, {
			kind: "Error",
			name: e.name,
			message: e.message,
			stack: e.stack,
			// Only field whose content we did not build ourselves (a `fetch failed`
			// cause carries the target URL), and this log never leaves the browser.
			cause: import.meta.env.DEV ? e.cause : undefined,
		});
		return;
	}
	// oxlint-disable-next-line anti-slop/no-runtime-typeof -- devtools label, not narrowing
	console.error(label, { kind: typeof e, value: e });
}
