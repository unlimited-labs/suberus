import { describe, expect, it } from "vitest";
import { parseLlmResponse } from "./extraction-llm-parse";

const wrap = (body: object) => JSON.stringify(body);

describe("parseLlmResponse", () => {
	it("reads short and long field names as the same shape", () => {
		const short = parseLlmResponse(
			wrap({
				t: "A Title",
				a: [{ fn: "Ada", ln: "Lovelace", e: "ada@x.org", af: "Analytical" }],
				k: ["computing"],
			}),
		);
		const long = parseLlmResponse(
			wrap({
				title: "A Title",
				authors: [
					{
						firstName: "Ada",
						lastName: "Lovelace",
						email: "ada@x.org",
						affiliationName: "Analytical",
					},
				],
				keywords: ["computing"],
			}),
		);
		expect(short).toEqual(long);
		expect(short.title).toBe("A Title");
		expect(short.authors).toEqual([
			{
				firstName: "Ada",
				lastName: "Lovelace",
				email: "ada@x.org",
				affiliationName: "Analytical",
			},
		]);
		expect(short.keywords).toEqual(["computing"]);
	});

	it("prefers the short name when the model emits both", () => {
		const result = parseLlmResponse(wrap({ t: "Short", title: "Long" }));
		expect(result.title).toBe("Short");
	});

	it("drops authors missing either name part, and keeps positional lists aligned", () => {
		const result = parseLlmResponse(
			wrap({
				a: [
					{ fn: "Ada", ln: "Lovelace" },
					{ fn: "Nameless" },
					{ fn: "Alan", ln: "Turing" },
				],
				emails: ["ada@x.org", "alan@x.org"],
				affiliations: ["Analytical", "Bletchley"],
			}),
		);
		expect(result.authors).toEqual([
			{
				firstName: "Ada",
				lastName: "Lovelace",
				email: "ada@x.org",
				affiliationName: "Analytical",
			},
			{
				firstName: "Alan",
				lastName: "Turing",
				email: "alan@x.org",
				affiliationName: "Bletchley",
			},
		]);
	});

	it("keeps only the address out of a dirty email and lowercases it", () => {
		const result = parseLlmResponse(
			wrap({
				a: [{ fn: "Ada", ln: "Lovelace", e: "mail to: ADA@X.ORG please" }],
			}),
		);
		expect(result.authors?.[0].email).toBe("ada@x.org");
	});

	it("returns empty for prose, malformed JSON and a non-object payload", () => {
		expect(parseLlmResponse("no json here")).toEqual({});
		expect(parseLlmResponse('{"t": "unterminated')).toEqual({});
		expect(parseLlmResponse("[1,2,3]")).toEqual({});
	});

	it("survives the trailing-comma and footnote debris the model emits", () => {
		const result = parseLlmResponse('```json\n{"t":"Title","k":["a",],}\n```');
		expect(result.title).toBe("Title");
	});
});
