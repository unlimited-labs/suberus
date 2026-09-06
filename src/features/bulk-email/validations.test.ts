import { describe, expect, it } from "vitest";
import { sheetCampaignCreateInput, sheetSchema } from "./validations";

const sheet = {
	columns: ["Name", "Mail", "Hotel"],
	rows: [["Ann", "ann@x.com", "Willa"]],
};

function create(overrides: Record<string, unknown>) {
	return sheetCampaignCreateInput.safeParse({
		sheet,
		emailColumn: 1,
		mapping: [{ column: 2, target: { kind: "data", key: "hotel" } }],
		unmatched: "skip",
		...overrides,
	});
}

describe("sheetSchema", () => {
	it("rejects a row that does not match the column count", () => {
		expect(
			sheetSchema.safeParse({ columns: ["A", "B"], rows: [["one"]] }).success,
		).toBe(false);
	});

	it("rejects duplicate column names", () => {
		expect(
			sheetSchema.safeParse({ columns: ["A", "A"], rows: [["1", "2"]] })
				.success,
		).toBe(false);
	});
});

describe("sheetCampaignCreateInput", () => {
	it("accepts a well-formed mapping", () => {
		expect(create({}).success).toBe(true);
	});

	it("rejects mapping the email column", () => {
		expect(
			create({
				mapping: [{ column: 1, target: { kind: "data", key: "hotel" } }],
			}).success,
		).toBe(false);
	});

	it("rejects a reserved placeholder key", () => {
		expect(
			create({
				mapping: [{ column: 2, target: { kind: "data", key: "firstName" } }],
			}).success,
		).toBe(false);
	});

	it("rejects two columns claiming the same built-in field", () => {
		expect(
			create({
				mapping: [
					{ column: 0, target: { kind: "builtin", field: "firstName" } },
					{ column: 2, target: { kind: "builtin", field: "firstName" } },
				],
			}).success,
		).toBe(false);
	});

	it("rejects a column index outside the sheet", () => {
		expect(
			create({
				mapping: [{ column: 9, target: { kind: "data", key: "hotel" } }],
			}).success,
		).toBe(false);
	});
});
