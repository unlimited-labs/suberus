import { describe, expect, it, vi } from "vitest";
import {
	assertKnownPlaceholders,
	type PlaceholderRecipient,
	placeholderIssues,
} from "./placeholder-issues";

const recipient = (
	email: string,
	data: Record<string, string> = {},
): PlaceholderRecipient => ({
	email,
	firstName: "Ada",
	lastName: "Lovelace",
	titles: "Prof.",
	data,
});

describe("placeholderIssues", () => {
	it("reports tokens that name neither a builtin nor a data column", async () => {
		const { unknown } = await placeholderIssues(
			{ room: "Room" },
			["firstName", "room", "nope"],
			async () => [],
		);
		expect(unknown).toEqual(["nope"]);
	});

	it("does not load recipients when no known token is in play", async () => {
		const load = vi.fn(async () => []);
		const result = await placeholderIssues({}, ["nope"], load);
		expect(load).not.toHaveBeenCalled();
		expect(result).toEqual({ unknown: ["nope"], missing: [] });
	});

	it("counts recipients whose column is empty and samples at most five", async () => {
		const rows = Array.from({ length: 7 }, (_, i) => recipient(`u${i}@x.org`));
		const { missing } = await placeholderIssues(
			{ room: "Room" },
			["room"],
			async () => [...rows, recipient("has@x.org", { room: "A1" })],
		);
		expect(missing).toEqual([
			{
				key: "room",
				count: 7,
				sample: ["u0@x.org", "u1@x.org", "u2@x.org", "u3@x.org", "u4@x.org"],
			},
		]);
	});

	it("reports nothing missing when every recipient has the column", async () => {
		const { missing } = await placeholderIssues(
			{ room: "Room" },
			["room"],
			async () => [recipient("a@x.org", { room: "A1" })],
		);
		expect(missing).toEqual([]);
	});

	it("treats builtins as satisfied by the recipient's own fields", async () => {
		const { unknown, missing } = await placeholderIssues(
			{},
			["firstName"],
			async () => [recipient("a@x.org")],
		);
		expect(unknown).toEqual([]);
		expect(missing).toEqual([]);
	});
});

describe("assertKnownPlaceholders", () => {
	it("passes when the subject and body only use known tokens", async () => {
		await expect(
			assertKnownPlaceholders(
				async () => ({ unknown: [], missing: [] }),
				"Hi {{firstName}}",
				"See you in {{room}}",
			),
		).resolves.toBeUndefined();
	});

	it("400s and names every unknown token", async () => {
		const thrown = await assertKnownPlaceholders(
			async () => ({ unknown: ["nope", "alsoNope"], missing: [] }),
			"Hi {{nope}}",
			"and {{alsoNope}}",
		).catch((e: unknown) => e);
		expect(thrown).toBeInstanceOf(Response);
		// SAFETY: asserted to be a Response on the line above.
		const response = thrown as Response;
		expect(response.status).toBe(400);
		await expect(response.text()).resolves.toBe(
			"Unknown placeholders: {{nope}}, {{alsoNope}}",
		);
	});

	it("scans the subject and the body as one text", async () => {
		const seen: string[][] = [];
		await assertKnownPlaceholders(
			async (tokens) => {
				seen.push(tokens);
				return { unknown: [], missing: [] };
			},
			"{{a}}",
			"{{b}}",
		);
		expect(seen).toEqual([["a", "b"]]);
	});
});
