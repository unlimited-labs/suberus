import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	applyBillingConfig,
	buyerLines,
	invoiceState,
	registryFill,
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

describe("VAT ID in both modes", () => {
	const vatRequired = {
		...DEFAULT_BILLING_DETAILS,
		fields: {
			...DEFAULT_BILLING_DETAILS.fields,
			vatId: { state: "REQUIRED" as const, label: "", help: "" },
		},
	};
	const schema = applyBillingConfig(
		base.extend({ vatId: z.string().optional() }),
		vatRequired,
	);

	it("requires a REQUIRED VAT ID beside the Simple text box", () => {
		const result = schema.safeParse({ needInvoice: true, billingText: "ACME" });
		expect(
			result.success ? [] : result.error.issues.map((i) => i.path[0]),
		).toEqual(["vatId"]);
	});

	it("submits the VAT ID with the Simple text and prints it on the buyer card", () => {
		const shown = submittedBillingValues(
			{ needInvoice: true, billingText: "ACME", vatId: "PL6750002236" },
			vatRequired,
		);
		expect(shown).toEqual({ billingText: "ACME", vatId: "PL6750002236" });
		expect(buyerLines(shown)).toEqual(["ACME", "VAT ID: PL6750002236"]);
	});
});

describe("registryFill", () => {
	const registry = {
		status: "VERIFIED" as const,
		registryName: "AKADEMIA GÓRNICZO-HUTNICZA",
		registryAddress: "AL. ADAMA MICKIEWICZA 30\n30-059 KRAKÓW",
	};
	const structured = {
		...DEFAULT_BILLING_DETAILS,
		mode: "STRUCTURED" as const,
		fields: {
			...DEFAULT_BILLING_DETAILS.fields,
			organizationName: { state: "REQUIRED" as const, label: "", help: "" },
			streetAddress: { state: "OPTIONAL" as const, label: "", help: "" },
			postalCode: { state: "OPTIONAL" as const, label: "", help: "" },
			city: { state: "OPTIONAL" as const, label: "", help: "" },
		},
	};

	it("fills only the empty fields of the Separate fields form", () => {
		expect(
			registryFill(
				{ billingOrganization: "AGH", billingCity: "" },
				structured,
				registry,
			),
		).toEqual({
			billingStreet: "AL. ADAMA MICKIEWICZA 30",
			billingPostalCode: "30-059",
			billingCity: "KRAKÓW",
		});
	});

	it("puts a one-line address into the street instead of guessing postal code and city", () => {
		expect(
			registryFill({ billingOrganization: "X" }, structured, {
				...registry,
				registryAddress: "1 RUE X 75001 PARIS",
			}),
		).toEqual({ billingStreet: "1 RUE X 75001 PARIS" });
	});

	it("skips switched-off fields", () => {
		const noPostal = {
			...structured,
			fields: {
				...structured.fields,
				postalCode: { state: "OFF" as const, label: "", help: "" },
			},
		};
		expect(registryFill({}, noPostal, registry)).not.toHaveProperty(
			"billingPostalCode",
		);
	});

	it("fills an empty Simple text box with name and address, never a filled one", () => {
		expect(
			registryFill({ billingText: "" }, DEFAULT_BILLING_DETAILS, registry),
		).toEqual({
			billingText:
				"AKADEMIA GÓRNICZO-HUTNICZA\nAL. ADAMA MICKIEWICZA 30\n30-059 KRAKÓW",
		});
		expect(
			registryFill({ billingText: "Mine" }, DEFAULT_BILLING_DETAILS, registry),
		).toEqual({});
	});

	it("offers nothing without registry details", () => {
		expect(
			registryFill({}, structured, {
				status: "VERIFIED" as const,
				registryName: null,
				registryAddress: null,
			}),
		).toEqual({});
		expect(
			registryFill({}, structured, {
				...registry,
				status: "NOT_FOUND" as const,
			}),
		).toEqual({});
	});
});

describe("invoiceState", () => {
	const structured = {
		...DEFAULT_BILLING_DETAILS,
		mode: "STRUCTURED" as const,
		fields: {
			...DEFAULT_BILLING_DETAILS.fields,
			organizationName: { state: "REQUIRED" as const, label: "", help: "" },
			city: { state: "OPTIONAL" as const, label: "", help: "" },
		},
	};

	it("is NONE when the participant needs no invoice", () => {
		expect(invoiceState({ needInvoice: false }, structured)).toBe("NONE");
	});

	it("is INCOMPLETE when a REQUIRED field of the active form is empty", () => {
		expect(
			invoiceState(
				{ needInvoice: true, billingOrganization: null },
				structured,
			),
		).toBe("INCOMPLETE");
	});

	it("is REQUESTED when every REQUIRED field is filled, OPTIONAL ones may be empty", () => {
		expect(
			invoiceState(
				{ needInvoice: true, billingOrganization: "ACME" },
				structured,
			),
		).toBe("REQUESTED");
	});

	it("counts everyone under Invoice required, and ignores data from the other form", () => {
		expect(
			invoiceState(
				{ needInvoice: false, billingText: "ACME, old text form" },
				{ ...structured, invoiceRequired: true },
			),
		).toBe("INCOMPLETE");
	});

	it("is INCOMPLETE in Simple mode with an empty text box or a missing REQUIRED VAT ID", () => {
		const simple = {
			...DEFAULT_BILLING_DETAILS,
			fields: {
				...DEFAULT_BILLING_DETAILS.fields,
				vatId: { state: "REQUIRED" as const, label: "", help: "" },
			},
		};
		expect(
			invoiceState(
				{ needInvoice: true, billingText: " ", vatId: "PL6750002236" },
				simple,
			),
		).toBe("INCOMPLETE");
		expect(
			invoiceState({ needInvoice: true, billingText: "ACME" }, simple),
		).toBe("INCOMPLETE");
		expect(
			invoiceState(
				{ needInvoice: true, billingText: "ACME", vatId: "PL6750002236" },
				simple,
			),
		).toBe("REQUESTED");
	});
});
