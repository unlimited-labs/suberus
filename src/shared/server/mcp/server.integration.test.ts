import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import type { APIError } from "better-auth/api";
import { isInsufficientScopeError } from "better-auth/oauth2";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool, type McpActor } from "@/shared/server/mcp/define-tool";
import {
	buildMcpServer,
	createSuberusMcpHandler,
} from "@/shared/server/mcp/server";

const editorTool = defineTool({
	name: "probe_read",
	title: "Probe read",
	description: "readable by editors",
	input: z.object({ value: z.string().min(2) }),
	roles: ["ADMIN", "EDITOR"],
	scope: "probe:read",
	readOnly: true,
	async handler(input, actor) {
		return { echoed: input.value, by: actor.id };
	},
});

const adminTool = defineTool({
	name: "probe_admin",
	title: "Probe admin",
	description: "admins only",
	input: z.object({}),
	roles: ["ADMIN"],
	scope: "probe:write",
	async handler() {
		return { ok: true };
	},
});

const failingTool = defineTool({
	name: "probe_conflict",
	title: "Probe conflict",
	description: "always conflicts",
	input: z.object({}),
	roles: ["ADMIN", "EDITOR"],
	scope: "probe:read",
	async handler(): Promise<never> {
		throw new Response("Email already in use", { status: 409 });
	},
});

const tools = [editorTool, adminTool, failingTool];

function firstText(content: unknown): string {
	const block = Array.isArray(content) ? content[0] : undefined;
	if (
		block &&
		typeof block === "object" &&
		"text" in block &&
		typeof block.text === "string"
	) {
		return block.text;
	}
	throw new Error(
		`expected a text content block, got ${JSON.stringify(content)}`,
	);
}

async function connect(
	actor: Omit<McpActor, "email"> | null,
	challenge?: { error: unknown },
) {
	const server = buildMcpServer(
		{ name: "suberus-test", version: "0", tools },
		actor && { ...actor, email: "admin@example.test" },
		challenge,
	);
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	await server.connect(serverTransport);
	const client = new Client({ name: "test", version: "0" });
	await client.connect(clientTransport);
	return client;
}

describe("MCP tool registry", () => {
	let admin: Client;

	beforeEach(async () => {
		admin = await connect({
			id: "admin-1",
			role: "ADMIN",
			scopes: ["probe:read", "probe:write"],
		});
	});

	it("exposes every tool an ADMIN may use", async () => {
		const { tools: listed } = await admin.listTools();
		expect(listed.map((t) => t.name).sort()).toEqual([
			"probe_admin",
			"probe_conflict",
			"probe_read",
		]);
	});

	it("hides admin-only tools from an EDITOR", async () => {
		const editor = await connect({
			id: "editor-1",
			role: "EDITOR",
			scopes: ["probe:read", "probe:write"],
		});
		const { tools: listed } = await editor.listTools();
		expect(listed.map((t) => t.name)).not.toContain("probe_admin");
		expect(listed.map((t) => t.name)).toContain("probe_read");
	});

	it("still lists a tool the token was not granted the scope for", async () => {
		const readOnly = await connect({
			id: "admin-1",
			role: "ADMIN",
			scopes: ["probe:read"],
		});
		const { tools: listed } = await readOnly.listTools();
		expect(listed.map((t) => t.name)).toContain("probe_admin");
	});

	it("parks an insufficient_scope challenge naming every scope to re-consent to", async () => {
		const challenge: { error: unknown } = { error: null };
		const readOnly = await connect(
			{ id: "admin-1", role: "ADMIN", scopes: ["openid", "probe:read"] },
			challenge,
		);

		const result = await readOnly.callTool({
			name: "probe_admin",
			arguments: {},
		});

		expect(result.isError).toBe(true);
		// Held scopes travel with the missing one: re-consent overwrites the row.
		expect(isInsufficientScopeError(challenge.error)).toBe(true);
		expect(
			(challenge.error as APIError).body?.scope?.split(" ").sort(),
		).toEqual(["openid", "probe:read", "probe:write"]);
	});

	it("leaves the challenge unset when every scope is granted", async () => {
		const challenge: { error: unknown } = { error: null };
		const granted = await connect(
			{ id: "admin-1", role: "ADMIN", scopes: ["probe:read", "probe:write"] },
			challenge,
		);
		await granted.callTool({ name: "probe_admin", arguments: {} });
		expect(challenge.error).toBeNull();
	});

	it("registers nothing without an authenticated actor", async () => {
		const anonymous = await connect(null);
		const { tools: listed } = await anonymous.listTools();
		expect(listed).toEqual([]);
	});

	it("passes the actor through to the handler", async () => {
		const result = await admin.callTool({
			name: "probe_read",
			arguments: { value: "hello" },
		});
		expect(JSON.parse(firstText(result.content))).toEqual({
			echoed: "hello",
			by: "admin-1",
		});
	});

	it("rejects input that fails the shared zod schema", async () => {
		const result = await admin.callTool({
			name: "probe_read",
			arguments: { value: "x" },
		});
		expect(result.isError).toBe(true);
	});

	it("surfaces a thrown Response as an actionable tool error", async () => {
		const result = await admin.callTool({
			name: "probe_conflict",
			arguments: {},
		});
		expect(result.isError).toBe(true);
		expect(firstText(result.content)).toBe("409: Email already in use");
	});

	it("makes a tool outside the caller's role uncallable, not just hidden", async () => {
		const editor = await connect({
			id: "editor-1",
			role: "EDITOR",
			scopes: ["probe:read", "probe:write"],
		});
		await expect(
			editor.callTool({ name: "probe_admin", arguments: {} }),
		).rejects.toThrow("Tool probe_admin not found");
	});

	// Only works if fetch() resolves after the tool ran; a streamed answer would
	// deliver the parked error too late to become a 403.
	it("re-throws the parked challenge out of the HTTP handler", async () => {
		const handler = createSuberusMcpHandler({
			name: "suberus-test",
			version: "0",
			tools,
			allowedHostnames: ["mcp.test"],
		});

		const call = (body: unknown) =>
			handler(
				new Request("https://mcp.test/api/mcp", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						accept: "application/json, text/event-stream",
						host: "mcp.test",
					},
					body: JSON.stringify(body),
				}),
				{
					id: "admin-1",
					role: "ADMIN",
					email: "admin@example.test",
					scopes: ["probe:read"],
				},
			);

		await call({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2026-07-28",
				capabilities: {},
				clientInfo: { name: "test", version: "0" },
			},
		});

		await expect(
			call({
				jsonrpc: "2.0",
				id: 2,
				method: "tools/call",
				params: { name: "probe_admin", arguments: {} },
			}),
		).rejects.toSatisfy(isInsufficientScopeError);
	});

	// The SDK compares Origin's hostname: full origins 403 every browser-sent
	// request while header-less CLI clients keep working.
	it("admits a request whose Origin matches the configured hostname", async () => {
		const handler = createSuberusMcpHandler({
			name: "suberus-test",
			version: "0",
			tools,
			allowedHostnames: ["mcp.test"],
		});

		const response = await handler(
			new Request("https://mcp.test/api/mcp", {
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
					host: "mcp.test",
					origin: "https://mcp.test",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "initialize",
					params: {
						protocolVersion: "2026-07-28",
						capabilities: {},
						clientInfo: { name: "test", version: "0" },
					},
				}),
			}),
			{
				id: "admin-1",
				role: "ADMIN",
				email: "admin@example.test",
				scopes: ["probe:read"],
			},
		);

		expect(response.status).toBe(200);
	});

	it("advertises read-only and destructive hints", async () => {
		const { tools: listed } = await admin.listTools();
		const read = listed.find((t) => t.name === "probe_read");
		const write = listed.find((t) => t.name === "probe_admin");
		expect(read?.annotations?.readOnlyHint).toBe(true);
		expect(write?.annotations?.readOnlyHint).toBe(false);
	});
});
