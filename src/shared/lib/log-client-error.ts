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
export function extractZodIssueMessage(cause: unknown): string | null {
	const raw =
		cause instanceof Error ? cause.message : z.string().safeParse(cause).data;
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
export async function logClientError(
	label: string,
	cause: unknown,
): Promise<void> {
	if (cause instanceof Response) {
		let body = "";
		try {
			body = await cause.clone().text();
		} catch {
			body = "<unreadable body>";
		}
		console.error(label, {
			kind: "Response",
			status: cause.status,
			statusText: cause.statusText,
			url: cause.url,
			body: body.slice(0, 2000),
		});
		return;
	}
	if (cause instanceof Error) {
		console.error(label, {
			kind: "Error",
			name: cause.name,
			message: cause.message,
			stack: cause.stack,
			// Only field whose content we did not build ourselves (a `fetch failed`
			// cause carries the target URL), and this log never leaves the browser.
			cause: import.meta.env.DEV ? cause.cause : undefined,
		});
		return;
	}
	// oxlint-disable-next-line anti-slop/no-runtime-typeof -- devtools label, not narrowing
	console.error(label, { kind: typeof cause, value: cause });
}
