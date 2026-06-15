import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "@/env";
import { loggingMiddleware } from "@/logger";
import { VERSION_HEADER } from "@/shared/lib/version-skew";

// Protect server functions from CSRF. Defaults (Sec-Fetch-Site: same-origin,
// Origin/Referer vs request origin) cover our same-origin browser calls and are
// proxy-safe; no explicit `origin` so no server-only env leaks into the client bundle.
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

// Stamp the running build id on server-fn responses so a stale client tab can
// detect a backend redeploy and prompt the user to refresh (see version-skew).
const versionHeaderMiddleware = createMiddleware().server(async ({ next }) => {
	setResponseHeader(VERSION_HEADER, env.GIT_COMMIT);
	return next();
});

export const startInstance = createStart(() => ({
	requestMiddleware: [
		csrfMiddleware,
		versionHeaderMiddleware,
		loggingMiddleware,
	],
}));
