import { createMiddleware } from "@tanstack/react-start";
import { logger } from "@/logger";

function resolveLabel(method: string, pathname: string) {
	const prefix = "/_serverFn/";
	if (!pathname.startsWith(prefix)) return `[${method}] ${pathname}`;
	try {
		const json = JSON.parse(atob(pathname.slice(prefix.length)));
		// SAFETY: the manifest entries this middleware reads always name a string export.
		const name = (json.export as string).replace(
			/_createServerFn_handler$/,
			"",
		);
		return `[${method}] ${name}`;
	} catch {
		return `[${method}] ${pathname}`;
	}
}

// Lives in its own module (NOT logger.ts) so `logger.ts` stays a pure leaf with
// no framework dependency. `logger` is imported almost everywhere, so the bundler
// hoists it very early in the SSR chunk; if it also called `createMiddleware()` at
// module load, that runs before `@tanstack/react-start` initializes the export
// (`createMiddleware is not a function` at startup). Keeping the middleware here —
// imported only by `start.ts`, after react-start — avoids that ordering hazard.
export const loggingMiddleware = createMiddleware().server(
	async ({ request, pathname, next }) => {
		const label = resolveLabel(request.method, pathname);

		const start = Date.now();
		try {
			const result = await next();
			const ms = Date.now() - start;
			if (ms > 500) {
				logger.warn(`${label} - ${ms}ms (slow)`);
			} else {
				logger.debug(`${label} - ${ms}ms`);
			}
			return result;
		} catch (error) {
			const ms = Date.now() - start;
			if (error instanceof Response) {
				logger.debug(`${label} - ${error.status} ${ms}ms`);
			} else {
				logger.error(`${label} - error after ${ms}ms:`, error);
			}
			throw error;
		}
	},
);
