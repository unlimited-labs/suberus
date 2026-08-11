import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool, type McpActor } from "@/shared/server/mcp/define-tool";
import { runTool } from "@/shared/server/mcp/server";

const actor: McpActor = { id: "admin-1", role: "ADMIN" };

const tool = (impl: () => Promise<unknown>) =>
	defineTool({
		name: "probe",
		title: "Probe",
		description: "test tool",
		input: z.object({}),
		roles: ["ADMIN"],
		handler: impl,
	});

describe("runTool", () => {
	it("serialises a successful result as text content", async () => {
		const result = await runTool(
			tool(async () => ({ id: "u1" })),
			{},
			actor,
		);

		expect(result.isError).toBeUndefined();
		expect(result.content[0].text).toBe('{"id":"u1"}');
	});

	it("maps a thrown Response to an actionable tool error", async () => {
		const result = await runTool(
			tool(async () => {
				throw new Response("Email already in use", { status: 409 });
			}),
			{},
			actor,
		);

		expect(result.isError).toBe(true);
		expect(result.content[0].text).toBe("409: Email already in use");
	});

	it("propagates non-Response failures", async () => {
		await expect(
			runTool(
				tool(async () => {
					throw new Error("boom");
				}),
				{},
				actor,
			),
		).rejects.toThrow("boom");
	});
});
