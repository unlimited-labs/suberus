import { describe, expect, it } from "vitest";
import { billingChanges, mergeBillingChanges } from "./billing-changes";

describe("billingChanges", () => {
	const before = {
		needInvoice: true,
		billingText: null,
		billingOrganization: "ACME",
		billingStreet: null,
		billingPostalCode: null,
		billingCity: null,
		vatId: "PL5260250995",
		country: "Poland",
	};

	it("returns null when nothing billing-related changed", () => {
		expect(billingChanges(before, { ...before })).toBeNull();
	});

	it("treats empty text and a missing value as the same", () => {
		expect(billingChanges(before, { ...before, billingStreet: "" })).toBeNull();
	});

	it("lists every changed field with its old and new value", () => {
		expect(
			billingChanges(before, {
				...before,
				needInvoice: false,
				billingOrganization: "ACME Ltd",
				vatId: null,
				country: "Germany",
			}),
		).toEqual({
			needInvoice: { from: true, to: false },
			billingOrganization: { from: "ACME", to: "ACME Ltd" },
			vatId: { from: "PL5260250995", to: null },
			country: { from: "Poland", to: "Germany" },
		});
	});
});

describe("mergeBillingChanges", () => {
	it("keeps the first old value and the last new value per field", () => {
		expect(
			mergeBillingChanges([
				{ billingCity: { from: "Krakow", to: "Warsaw" } },
				{
					billingCity: { from: "Warsaw", to: "Gdansk" },
					vatId: { from: null, to: "PL5260250995" },
				},
			]),
		).toEqual({
			billingCity: { from: "Krakow", to: "Gdansk" },
			vatId: { from: null, to: "PL5260250995" },
		});
	});

	it("keeps an empty first value as the starting point", () => {
		expect(
			mergeBillingChanges([
				{ vatId: { from: null, to: "PL5260250995" } },
				{ vatId: { from: "PL5260250995", to: "PL7680002466" } },
			]),
		).toEqual({ vatId: { from: null, to: "PL7680002466" } });
	});

	it("drops a field that ended where it started", () => {
		expect(
			mergeBillingChanges([
				{ billingCity: { from: "Krakow", to: "Warsaw" } },
				{ billingCity: { from: "Warsaw", to: "Krakow" } },
			]),
		).toEqual({});
	});
});
