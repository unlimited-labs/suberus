import { z } from "zod";

/** Anthropic's documented default for `claude mcp add --callback-port`. */
export const DEFAULT_CALLBACK_PORT = 8080;

export const mcpDesktopClientInput = z.object({
	callbackPort: z.number().int().min(1024).max(65535),
});

export type McpDesktopClientInput = z.infer<typeof mcpDesktopClientInput>;
