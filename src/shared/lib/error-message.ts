import { z } from "zod";
import { hasRequestId } from "@/shared/errors/sanitize";

const issueArraySchema = z
	.array(
		z.object({
			message: z.string(),
			path: z.array(z.union([z.string(), z.number()])).optional(),
		}),
	)
	.min(1);
type ZodIssueLike = z.infer<typeof issueArraySchema>[number];
const issueEnvelopeSchema = z.object({ issues: issueArraySchema });

function humanizeField(path: Array<string | number> | undefined): string {
	const key = path?.filter((p): p is string => typeof p === "string").at(-1);
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
	cause: unknown,
	fallback = "Something went wrong",
): string {
	if (cause instanceof Error) {
		const trimmed = cause.message.trim();
		if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
			try {
				const parsed: unknown = JSON.parse(trimmed);
				const issues = issueArraySchema.safeParse(parsed);
				if (issues.success) return formatIssues(issues.data);
				const envelope = issueEnvelopeSchema.safeParse(parsed);
				if (envelope.success) return formatIssues(envelope.data.issues);
			} catch {}
		}
		const message = trimmed || fallback;
		return hasRequestId(cause)
			? `${message} (Reference: ${cause.requestId})`
			: message;
	}
	const asString = z.string().safeParse(cause);
	if (asString.success && asString.data.trim()) return asString.data;
	return fallback;
}
