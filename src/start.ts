import { createStart } from "@tanstack/react-start";
import { loggingMiddleware } from "@/logger";

export const startInstance = createStart(() => ({
	requestMiddleware: [loggingMiddleware],
}));
