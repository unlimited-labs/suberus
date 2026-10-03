import {
	createMcpHandler,
	hostHeaderValidationResponse,
	McpServer,
	originValidationResponse,
} from "@modelcontextprotocol/server";
import type { z } from "zod";
import type { McpActor, McpTool } from "@/shared/server/mcp/define-tool";

export interface McpServerConfig {
	name: string;
	version: string;
	tools: readonly McpTool[];
}

export interface McpHandlerConfig extends McpServerConfig {
	// Hostnames, not origins: the SDK compares Origin's hostname, so a full
	// origin never matches and 403s every browser-sent request.
	allowedHostnames: string[];
	resource: URL;
}

export async function runTool<Input extends z.ZodType>(
	tool: McpTool<Input>,
	input: z.output<Input>,
	actor: McpActor,
): Promise<{ content: [{ type: "text"; text: string }]; isError?: true }> {
	try {
		const result = await tool.handler(input, actor);
		return { content: [{ type: "text", text: JSON.stringify(result) }] };
	} catch (error) {
		// Domain failures arrive as a thrown Response; unwrapped they'd reach the
		// agent as an opaque transport error.
		if (error instanceof Response) {
			return {
				content: [
					{ type: "text", text: `${error.status}: ${await error.text()}` },
				],
				isError: true,
			};
		}
		throw error;
	}
}

export function buildMcpServer(
	config: McpServerConfig,
	actor: McpActor | null,
): McpServer {
	const server = new McpServer({
		name: config.name,
		version: config.version,
	});
	if (!actor) return server;

	const granted = new Set(actor.scopes);
	for (const tool of config.tools) {
		// Role = what the person may do, scope = how much they delegated. Only the
		// role hides a tool; an ungranted one stays listed and challenges on call,
		// so adding a tool never needs a reconnect.
		if (!tool.roles.includes(actor.role)) continue;
		const missingScope = !granted.has(tool.scope);
		server.registerTool(
			tool.name,
			{
				title: tool.title,
				description: tool.description,
				inputSchema: tool.input,
				annotations: {
					readOnlyHint: tool.readOnly ?? false,
					destructiveHint: tool.destructive ?? false,
				},
				// Held scopes travel with the missing one: re-consent overwrites
				// oauthConsent.scopes instead of unioning.
				scopeChallenge: () =>
					missingScope
						? {
								scopes: [
									tool.scope,
									...actor.scopes.filter((s) => s !== tool.scope),
								],
								errorDescription: `access token is missing required scope: ${tool.scope}`,
							}
						: undefined,
			},
			// The guard stays: transports without HTTP (in-memory, stdio) skip scopeChallenge.
			async (input) =>
				missingScope
					? {
							content: [
								{ type: "text", text: `missing required scope: ${tool.scope}` },
							],
							isError: true,
						}
					: runTool(tool, input, actor),
		);
	}

	return server;
}

export function createSuberusMcpHandler(config: McpHandlerConfig) {
	const handler = createMcpHandler((ctx) => {
		// SAFETY: our MCP auth middleware is what populates `extra`.
		const extra = ctx.authInfo?.extra as { actor?: McpActor } | undefined;
		return buildMcpServer(config, extra?.actor ?? null);
	});

	return async (request: Request, actor: McpActor): Promise<Response> => {
		const rejected =
			hostHeaderValidationResponse(request, config.allowedHostnames) ??
			originValidationResponse(request, config.allowedHostnames);
		if (rejected) return rejected;

		return handler.fetch(request, {
			authInfo: {
				token: "",
				clientId: "",
				scopes: actor.scopes,
				resource: config.resource,
				extra: { actor },
			},
		});
	};
}
