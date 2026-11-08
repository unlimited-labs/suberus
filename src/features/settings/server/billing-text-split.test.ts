import { beforeEach, describe, expect, it, vi } from "vitest";

const generateWithLlm = vi.fn();
vi.mock("@/shared/server/llm", () => ({ generateWithLlm }));
vi.mock("@/env", () => ({ env: { LLM_API_URL: "http://llm" } }));

const { splitBillingText } = await import("./billing-text-split");

beforeEach(() => vi.clearAllMocks());

describe("splitBillingText", () => {
	it("maps the LLM's JSON onto the catalogue columns and takes the VAT ID from the text itself", async () => {
		generateWithLlm.mockResolvedValue(
			'Sure: {"organizationName":"Uniwersytet Jagiellonski","streetAddress":"Golebia 24","postalCode":"31-007","city":"Krakow"}',
		);

		const result = await splitBillingText(
			"Uniwersytet Jagiellonski\nGolebia 24, 31-007 Krakow\nNIP PL 675-000-22-36",
		);

		expect(result).toEqual({
			billingOrganization: "Uniwersytet Jagiellonski",
			billingStreet: "Golebia 24",
			billingPostalCode: "31-007",
			billingCity: "Krakow",
			vatId: "PL6750002236",
		});
	});

	it("drops values that are not strings or exceed the column limits", async () => {
		generateWithLlm.mockResolvedValue(
			`{"organizationName":"${"x".repeat(250)}","postalCode":12345,"city":"Krakow"}`,
		);

		expect(await splitBillingText("whatever")).toEqual({
			billingCity: "Krakow",
		});
	});

	it("throws when the LLM answers with something that is not JSON", async () => {
		generateWithLlm.mockResolvedValue("I cannot help with that");
		await expect(splitBillingText("ACME")).rejects.toThrow();
	});
});
