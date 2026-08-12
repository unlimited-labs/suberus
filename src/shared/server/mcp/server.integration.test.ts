import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool, type McpActor } from "@/shared/server/mcp/define-tool";
import { buildMcpServer } from "@/shared/server/mcp/server";

const editorTool = defineTool({
	name: "probe_read",
	title: "Probe read",
	description: "readable by editors",
	input: z.object({ value: z.string().min(2) }),
	roles: ["ADMIN", "EDITOR"],
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

async function connect(actor: McpActor | null) {
	const server = buildMcpServer(
		{ name: "suberus-test", version: "0", tools },
		actor,
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
		admin = await connect({ id: "admin-1", role: "ADMIN" });
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
		const editor = await connect({ id: "editor-1", role: "EDITOR" });
		const { tools: listed } = await editor.listTools();
		expect(listed.map((t) => t.name)).not.toContain("probe_admin");
		expect(listed.map((t) => t.name)).toContain("probe_read");
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
		const editor = await connect({ id: "editor-1", role: "EDITOR" });
		await expect(
			editor.callTool({ name: "probe_admin", arguments: {} }),
		).rejects.toThrow("Tool probe_admin not found");
	});

	it("advertises read-only and destructive hints", async () => {
		const { tools: listed } = await admin.listTools();
		const read = listed.find((t) => t.name === "probe_read");
		const write = listed.find((t) => t.name === "probe_admin");
		expect(read?.annotations?.readOnlyHint).toBe(true);
		expect(write?.annotations?.readOnlyHint).toBe(false);
	});
});
