import {
	createMcpHandler,
	hostHeaderValidationResponse,
	McpServer,
	originValidationResponse,
} from "@modelcontextprotocol/server";
import { createInsufficientScopeError } from "better-auth/oauth2";
import {
	type McpActor,
	type McpTool,
	mcpActorSchema,
} from "@/shared/server/mcp/define-tool";

/**
 * Carries an insufficient_scope error out of a tool handler. The MCP SDK turns
 * every throw from a tool into an `isError` result, so the error can only reach
 * requireMcpAuth — which converts it into the RFC 6750 §3.1 challenge — by
 * being parked here and re-thrown once the handler has returned.
 */
interface ChallengeBox {
	error: unknown;
}

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
	challenge?: ChallengeBox,
): McpServer {
	const server = new McpServer({
		name: config.name,
		version: config.version,
	});
	if (!actor) return server;

	const granted = new Set(actor.scopes);
	for (const tool of config.tools) {
		// Role and scope are independent gates: what the person may do, and how
		// much of that they delegated to this application. Only the role decides
		// visibility — a tool the actor may use but has not granted stays listed
		// and answers a step-up challenge, so adding one never needs a reconnect.
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
			},
			async (input) => {
				if (missingScope) {
					// Every scope already held plus the missing one: better-auth
					// overwrites oauthConsent.scopes on re-consent instead of unioning
					// them, so a challenge naming only the missing scope would revoke
					// everything else the client was granted.
					const error = createInsufficientScopeError([
						...new Set([...actor.scopes, tool.scope]),
					]);
					if (challenge) challenge.error = error;
					throw error;
				}
				return runTool(tool, input, actor);
			},
		);
	}

	return server;
}

export function createSuberusMcpHandler(config: McpHandlerConfig) {
	const handler = createMcpHandler((ctx) => {
		const extra = ctx.authInfo?.extra as
			| { actor?: unknown; challenge?: ChallengeBox }
			| undefined;
		const actor = mcpActorSchema.safeParse(extra?.actor);
		return buildMcpServer(
			config,
			actor.success ? actor.data : null,
			extra?.challenge,
		);
	});

	return async (request: Request, actor: McpActor): Promise<Response> => {
		const rejected =
			hostHeaderValidationResponse(request, config.allowedHostnames) ??
			originValidationResponse(request, config.allowedOrigins);
		if (rejected) return rejected;

		const challenge: ChallengeBox = { error: null };
		const response = await handler.fetch(request, {
			authInfo: {
				token: "",
				clientId: "",
				scopes: actor.scopes,
				extra: { actor, challenge },
			},
		});
		if (challenge.error) throw challenge.error;
		return response;
	};
}
