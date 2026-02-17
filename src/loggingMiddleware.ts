import { createMiddleware } from "@tanstack/react-start";
import { logger } from "@/lib/server/logger.ts";

export const loggingMiddleware = createMiddleware().server(async ({ next }) => {
	const start = Date.now();
	try {
		const result = await next();
		const ms = Date.now() - start;
		if (ms > 500) {
			logger.warn(`[fn] ${ms}ms (slow)`);
		} else {
			logger.debug(`[fn] ${ms}ms`);
		}
		return result;
	} catch (error) {
		const ms = Date.now() - start;
		if (error instanceof Response) {
			logger.debug(`[fn] ${error.status} ${ms}ms`);
		} else {
			logger.error(`[fn] error after ${ms}ms:`, error);
		}
		throw error;
	}
});
