export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export interface ClientError extends Error {
	requestId: string;
}

export function hasRequestId(error: unknown): error is ClientError {
	return (
		error instanceof Error &&
		typeof (error as Partial<ClientError>).requestId === "string"
	);
}

// Prisma messages embed the failing model, field and argument values.
function isInternalError(error: Error): boolean {
	return error.name.startsWith("PrismaClient");
}

export function clientSafeMessage(error: unknown): string {
	if (!(error instanceof Error)) return GENERIC_ERROR_MESSAGE;
	if (isInternalError(error)) return GENERIC_ERROR_MESSAGE;
	return error.message.trim() || GENERIC_ERROR_MESSAGE;
}

// TanStack Start serializes the whole thrown error — stack and every own
// property — into the server-fn response body, with no production guard.
export function toClientError(error: unknown, requestId: string): Error {
	const message = clientSafeMessage(error);
	const safe = new Error(message);
	safe.stack = "";
	if (message === GENERIC_ERROR_MESSAGE) {
		(safe as ClientError).requestId = requestId;
	}
	return safe;
}
