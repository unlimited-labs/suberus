interface ZodIssueLike {
	path: Array<string | number>;
	message: string;
}

function isZodIssueArray(v: unknown): v is ZodIssueLike[] {
	return (
		Array.isArray(v) &&
		v.length > 0 &&
		v.every(
			(i) =>
				typeof i === "object" &&
				i !== null &&
				"message" in i &&
				typeof (i as { message: unknown }).message === "string" &&
				"path" in i &&
				Array.isArray((i as { path: unknown }).path),
		)
	);
}

/**
 * Attempts to extract a human-readable message from a thrown value when it
 * carries serialized Zod issues (e.g. TanStack `inputValidator` failures that
 * surface on the client as `Error` with a JSON-encoded message). Returns the
 * first issue formatted as `"<path>: <message>"` or `null` if not recognised.
 */
export function extractZodIssueMessage(e: unknown): string | null {
	const raw = e instanceof Error ? e.message : typeof e === "string" ? e : null;
	if (!raw) return null;
	const trimmed = raw.trim();
	if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		return null;
	}
	if (!isZodIssueArray(parsed)) return null;
	const first = parsed[0];
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
			...(import.meta.env.DEV ? { stack: e.stack, cause: e.cause } : {}),
		});
		return;
	}
	console.error(label, { kind: typeof e, value: e });
}
