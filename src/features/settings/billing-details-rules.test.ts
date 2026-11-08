import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	applyBillingConfig,
	buyerLines,
	submittedBillingValues,
} from "./billing-details-rules";
import { DEFAULT_BILLING_DETAILS } from "./billing-details-schema";

const base = z.object({ needInvoice: z.boolean(), billingText: z.string() });
const optionalInvoice = applyBillingConfig(base, DEFAULT_BILLING_DETAILS);
const requiredInvoice = applyBillingConfig(base, {
	...DEFAULT_BILLING_DETAILS,
	invoiceRequired: true,
});

function billingTextErrors(result: z.ZodSafeParseResult<unknown>) {
	return result.success
		? []
		: result.error.issues.filter((i) => i.path.join(".") === "billingText");
}

describe("applyBillingConfig (Simple mode)", () => {
	it("accepts empty details when no invoice is wanted", () => {
		expect(
			optionalInvoice.safeParse({ needInvoice: false, billingText: "" })
				.success,
		).toBe(true);
	});

	it("requires the text once the participant asks for an invoice", () => {
		const result = optionalInvoice.safeParse({
			needInvoice: true,
			billingText: "  ",
		});
		expect(billingTextErrors(result)).toHaveLength(1);
	});

	it("requires the text under Invoice required even without the checkbox", () => {
		const result = requiredInvoice.safeParse({
			needInvoice: false,
			billingText: "",
		});
		expect(billingTextErrors(result)).toHaveLength(1);
	});

	it("accepts filled details under Invoice required", () => {
		expect(
			requiredInvoice.safeParse({ needInvoice: false, billingText: "ACME" })
				.success,
		).toBe(true);
	});

	it("keeps the base schema's own rules", () => {
		const result = requiredInvoice.safeParse({
			needInvoice: "yes",
			billingText: "ACME",
		});
		expect(result.success).toBe(false);
	});
});

describe("applyBillingConfig (Separate fields mode)", () => {
	const structuredBase = base.extend({
		billingOrganization: z.string().optional(),
		billingCity: z.string().optional(),
	});
	const config = {
		...DEFAULT_BILLING_DETAILS,
		mode: "STRUCTURED" as const,
		fields: {
			...DEFAULT_BILLING_DETAILS.fields,
			organizationName: { state: "REQUIRED" as const, label: "", help: "" },
			city: { state: "OPTIONAL" as const, label: "", help: "" },
		},
	};
	const schema = applyBillingConfig(structuredBase, config);

	function errorPaths(result: z.ZodSafeParseResult<unknown>) {
		return result.success
			? []
			: result.error.issues.map((i) => i.path.join("."));
	}

	it("requires each REQUIRED field once an invoice is needed", () => {
		expect(
			errorPaths(schema.safeParse({ needInvoice: true, billingText: "" })),
		).toEqual(["billingOrganization"]);
	});

	it("ignores the text box and OPTIONAL fields", () => {
		expect(
			schema.safeParse({
				needInvoice: true,
				billingText: "",
				billingOrganization: "ACME",
			}).success,
		).toBe(true);
	});

	it("requires nothing when no invoice is needed", () => {
		expect(
			schema.safeParse({ needInvoice: false, billingText: "" }).success,
		).toBe(true);
	});
});

describe("submittedBillingValues", () => {
	const structured = {
		...DEFAULT_BILLING_DETAILS,
		mode: "STRUCTURED" as const,
		fields: {
			...DEFAULT_BILLING_DETAILS.fields,
			organizationName: { state: "OPTIONAL" as const, label: "", help: "" },
		},
	};
	const values = {
		needInvoice: true,
		billingText: "old text",
		billingOrganization: "ACME",
		billingCity: "Krakow",
	};

	it("keeps only the fields the active form shows", () => {
		expect(submittedBillingValues(values, structured)).toEqual({
			billingOrganization: "ACME",
		});
		expect(submittedBillingValues(values, DEFAULT_BILLING_DETAILS)).toEqual({
			billingText: "old text",
		});
	});

	it("sends nothing when no invoice is needed", () => {
		expect(
			submittedBillingValues({ ...values, needInvoice: false }, structured),
		).toEqual({});
	});
});

describe("buyerLines", () => {
	it("lays out the separate fields like an invoice address", () => {
		expect(
			buyerLines({
				billingOrganization: "ACME",
				billingStreet: null,
				billingPostalCode: "30-059",
				billingCity: "Krakow",
				country: "Poland",
			}),
		).toEqual(["ACME", "30-059 Krakow", "Poland"]);
	});

	it("splits the free text into lines and drops blanks", () => {
		expect(
			buyerLines({ billingText: "ACME\n\n1 Main St ", country: "" }),
		).toEqual(["ACME", "1 Main St"]);
	});
});
