import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { loggingMiddleware } from "@/logger";

// Protect server functions from CSRF. Defaults (Sec-Fetch-Site: same-origin,
// Origin/Referer vs request origin) cover our same-origin browser calls and are
// proxy-safe; no explicit `origin` so no server-only env leaks into the client bundle.
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware, loggingMiddleware],
}));
