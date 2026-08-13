import {
	createMcpHandler,
	hostHeaderValidationResponse,
	McpServer,
	originValidationResponse,
} from "@modelcontextprotocol/server";
import { createInsufficientScopeError } from "better-auth/oauth2";
import type { McpActor, McpTool } from "@/shared/server/mcp/define-tool";

/**
 * The SDK turns every throw from a tool into an `isError` result, so an
 * insufficient_scope error reaches requireMcpAuth (which makes it a challenge)
 * only by being parked here and re-thrown after the handler returns.
 */
interface ChallengeBox {
	error: unknown;
}

export interface McpServerConfig {
	name: string;
	version: string;
	tools: readonly McpTool[];
}

export interface McpHandlerConfig extends McpServerConfig {
	// Hostnames, not origins: the SDK compares Origin's hostname, so a full
	// origin never matches and 403s every browser-sent request.
	allowedHostnames: string[];
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
	challenge?: ChallengeBox,
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
			},
			async (input) => {
				if (missingScope) {
					// Held scopes travel with the missing one: re-consent overwrites
					// oauthConsent.scopes instead of unioning.
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
			| { actor?: McpActor; challenge?: ChallengeBox }
			| undefined;
		return buildMcpServer(config, extra?.actor ?? null, extra?.challenge);
	});

	return async (request: Request, actor: McpActor): Promise<Response> => {
		const rejected =
			hostHeaderValidationResponse(request, config.allowedHostnames) ??
			originValidationResponse(request, config.allowedHostnames);
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
