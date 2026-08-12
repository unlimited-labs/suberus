import {
	createMcpHandler,
	hostHeaderValidationResponse,
	McpServer,
	originValidationResponse,
} from "@modelcontextprotocol/server";
import {
	type McpActor,
	type McpTool,
	mcpActorSchema,
} from "@/shared/server/mcp/define-tool";

export interface McpHandlerConfig {
	name: string;
	version: string;
	tools: readonly McpTool[];
	allowedHostnames: string[];
	allowedOrigins: string[];
}

export async function runTool(
	tool: McpTool,
	input: unknown,
	actor: McpActor,
): Promise<{ content: [{ type: "text"; text: string }]; isError?: true }> {
	try {
		const result = await tool.handler(input, actor);
		return { content: [{ type: "text", text: JSON.stringify(result) }] };
	} catch (error) {
		// The users/* service layer signals domain failures by throwing a Response
		// (404/409/403). Unwrapped, those surface to the agent as an opaque
		// transport error instead of something it can act on.
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
	config: Omit<McpHandlerConfig, "allowedHostnames" | "allowedOrigins">,
	actor: McpActor | null,
): McpServer {
	const server = new McpServer({
		name: config.name,
		version: config.version,
	});
	if (!actor) return server;

	const granted = new Set(actor.scopes);
	for (const tool of config.tools) {
		// Role and scope are independent gates: what the person may do, and how
		// much of that they delegated to this application.
		if (!tool.roles.includes(actor.role)) continue;
		if (!granted.has(tool.scope)) continue;
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
			},
			async (input) => runTool(tool, input, actor),
		);
	}

	return server;
}

export function createSuberusMcpHandler(config: McpHandlerConfig) {
	const handler = createMcpHandler((ctx) => {
		const actor = mcpActorSchema.safeParse(ctx.authInfo?.extra);
		return buildMcpServer(config, actor.success ? actor.data : null);
	});

	return async (request: Request, actor: McpActor): Promise<Response> => {
		const rejected =
			hostHeaderValidationResponse(request, config.allowedHostnames) ??
			originValidationResponse(request, config.allowedOrigins);
		if (rejected) return rejected;

		return handler.fetch(request, {
			authInfo: { token: "", clientId: "", scopes: [], extra: actor },
		});
	};
}
