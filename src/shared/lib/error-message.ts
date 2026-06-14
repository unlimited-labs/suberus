interface ZodIssueLike {
	message: string;
	path?: Array<string | number>;
}

function isZodIssueArray(value: unknown): value is ZodIssueLike[] {
	return (
		Array.isArray(value) &&
		value.length > 0 &&
		value.every(
			(item) =>
				typeof item === "object" &&
				item !== null &&
				typeof (item as ZodIssueLike).message === "string",
		)
	);
}

function humanizeField(path: Array<string | number> | undefined): string {
	const key = path?.filter((p) => typeof p === "string").at(-1);
	if (!key) return "";
	return key
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/[_-]+/g, " ")
		.replace(/^./, (c) => c.toUpperCase());
}

function formatIssues(issues: ZodIssueLike[]): string {
	return issues
		.map((issue) => {
			const field = humanizeField(issue.path);
			return field ? `${field}: ${issue.message}` : issue.message;
		})
		.join("\n");
}

/**
 * Turn an unknown error into a user-friendly message.
 * Server-fn input validation (Zod) throws an Error whose `message` is a
 * JSON-stringified issue array; unpack it into readable "Field: reason" lines
 * instead of dumping raw JSON into a toast.
 */
export function getErrorMessage(
	error: unknown,
	fallback = "Something went wrong",
): string {
	if (error instanceof Error) {
		const trimmed = error.message.trim();
		if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
			try {
				const parsed = JSON.parse(trimmed);
				if (isZodIssueArray(parsed)) return formatIssues(parsed);
				if (isZodIssueArray((parsed as { issues?: unknown }).issues)) {
					return formatIssues((parsed as { issues: ZodIssueLike[] }).issues);
				}
			} catch {
				// not JSON — fall through to raw message
			}
		}
		return trimmed || fallback;
	}
	if (typeof error === "string" && error.trim()) return error;
	return fallback;
}
