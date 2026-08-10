import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { logger } from "@/logger";
import { toClientError } from "@/shared/errors/sanitize";

// Must be a function middleware: request middlewares sit outside
// `handleServerAction`, which catches handler errors itself and returns a
// serialized 500, so a request-level catch never sees them. Module placement
// follows logging-middleware.ts (imported only by start.ts).
export const errorSanitizeMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof Response || isRedirect(error) || isNotFound(error)) {
			throw error;
		}
		const requestId = crypto.randomUUID().slice(0, 8);
		logger.error(`server fn error [${requestId}]:`, error);
		throw toClientError(error, requestId);
	}
});
