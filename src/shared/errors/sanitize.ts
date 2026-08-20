export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

import { z } from "zod";

export interface ClientError extends Error {
	requestId: string;
}

export function hasRequestId(cause: unknown): cause is ClientError {
	return (
		cause instanceof Error &&
		// SAFETY: probing for our requestId marker on an arbitrary error.
		typeof (cause as Partial<ClientError>).requestId === "string"
	);
}

// Infrastructure messages embed hosts, buckets, container paths and query
// arguments. Deliberately thrown errors are plain `new Error(message)`: no
// `code`, no `$metadata`, not a native subclass.
// ponytail: denylist, so an exotic library error without those markers still
// leaks. Sealing it means marking all ~100 deliberate throws instead.
function isInternalError(error: Error): boolean {
	if (error.name.startsWith("PrismaClient")) return true;
	if (
		error instanceof TypeError ||
		error instanceof RangeError ||
		error instanceof ReferenceError ||
		error instanceof SyntaxError
	) {
		return true;
	}
	// SAFETY: probing for infrastructure-error markers that may be absent.
	const extras = error as { code?: unknown; $metadata?: unknown };
	return (
		z.string().safeParse(extras.code).success || extras.$metadata !== undefined
	);
}

export function clientSafeMessage(cause: unknown): string {
	if (!(cause instanceof Error)) return GENERIC_ERROR_MESSAGE;
	if (isInternalError(cause)) return GENERIC_ERROR_MESSAGE;
	return cause.message.trim() || GENERIC_ERROR_MESSAGE;
}

// TanStack Start serializes the whole thrown error — stack and every own
// property — into the server-fn response body, with no production guard.
export function toClientError(cause: unknown, requestId: string): Error {
	const message = clientSafeMessage(cause);
	const safe = new Error(message);
	safe.stack = "";
	if (message === GENERIC_ERROR_MESSAGE) {
		// SAFETY: this is the assignment that makes `safe` a ClientError.
		(safe as ClientError).requestId = requestId;
		return safe;
	}
	// Carry the discriminator of a message we already judged client-safe. `cause`
	// stays behind: it usually wraps the infrastructure cause this strips.
	if (cause instanceof Error) safe.name = cause.name;
	return safe;
}
