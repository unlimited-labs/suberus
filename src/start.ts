import { createStart } from "@tanstack/react-start";
import { loggingMiddleware } from "@/loggingMiddleware.ts";

export const startInstance = createStart(() => ({
	requestMiddleware: [loggingMiddleware],
}));
