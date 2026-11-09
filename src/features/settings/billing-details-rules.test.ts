import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	applyBillingConfig,
	becomesStricter,
	billingConfigFor,
	buyerLines,
	initialBillingText,
	invoiceState,
	participantBillingWrite,
	previousFormValues,
	registryFill,
	requirednessOf,
	showsPreviousText,
	submittedBillingValues,
} from "./billing-details-rules";
import {
	BILLING_FIELD_KEYS,
	type BillingDetailsSettings,
	type BillingFieldState,
	DEFAULT_BILLING_DETAILS,
} from "./billing-details-schema";

type FieldStates = Partial<
	Record<keyof BillingDetailsSettings["fields"], BillingFieldState>
>;

function withFields(
	states: FieldStates,
	overrides: Partial<BillingDetailsSettings> = {},
): BillingDetailsSettings {
	const fields = { ...DEFAULT_BILLING_DETAILS.fields };
	for (const key of BILLING_FIELD_KEYS) {
		const state = states[key];
		if (state) fields[key] = { state, label: "", help: "" };
	}
	return { ...DEFAULT_BILLING_DETAILS, ...overrides, fields };
}

const structuredConfig = (states: FieldStates) =>
	withFields(states, { mode: "STRUCTURED" });

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
	const config = structuredConfig({
		organizationName: "REQUIRED",
		city: "OPTIONAL",
	});
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
	const structured = structuredConfig({ organizationName: "OPTIONAL" });
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
	const vatRequired = withFields({ vatId: "REQUIRED" });
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
	const structured = structuredConfig({
		organizationName: "REQUIRED",
		streetAddress: "OPTIONAL",
		postalCode: "OPTIONAL",
		city: "OPTIONAL",
	});

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
	const participant = { role: "AUTHOR", isActive: true } as const;
	const structured = structuredConfig({
		organizationName: "REQUIRED",
		city: "OPTIONAL",
	});

	it("is NONE when the participant needs no invoice", () => {
		expect(
			invoiceState({ ...participant, needInvoice: false }, structured),
		).toBe("NONE");
	});

	it("is INCOMPLETE when a REQUIRED field of the active form is empty", () => {
		expect(
			invoiceState(
				{ ...participant, needInvoice: true, billingOrganization: null },
				structured,
			),
		).toBe("INCOMPLETE");
	});

	it("is REQUESTED when every REQUIRED field is filled, OPTIONAL ones may be empty", () => {
		expect(
			invoiceState(
				{ ...participant, needInvoice: true, billingOrganization: "ACME" },
				structured,
			),
		).toBe("REQUESTED");
	});

	it("counts everyone under Invoice required, and ignores data from the other form", () => {
		expect(
			invoiceState(
				{
					...participant,
					needInvoice: false,
					billingText: "ACME, old text form",
				},
				{ ...structured, invoiceRequired: true },
			),
		).toBe("INCOMPLETE");
	});

	it("is INCOMPLETE in Simple mode with an empty text box or a missing REQUIRED VAT ID", () => {
		const simple = withFields({ vatId: "REQUIRED" });
		expect(
			invoiceState(
				{
					...participant,
					needInvoice: true,
					billingText: " ",
					vatId: "PL6750002236",
				},
				simple,
			),
		).toBe("INCOMPLETE");
		expect(
			invoiceState(
				{ ...participant, needInvoice: true, billingText: "ACME" },
				simple,
			),
		).toBe("INCOMPLETE");
		expect(
			invoiceState(
				{
					...participant,
					needInvoice: true,
					billingText: "ACME",
					vatId: "PL6750002236",
				},
				simple,
			),
		).toBe("REQUESTED");
	});

	it("is NONE for admins and deactivated accounts, even under Invoice required", () => {
		const required = { ...structured, invoiceRequired: true };
		expect(
			invoiceState(
				{ ...participant, role: "ADMIN", needInvoice: true },
				required,
			),
		).toBe("NONE");
		expect(
			invoiceState(
				{ ...participant, isActive: false, needInvoice: true },
				required,
			),
		).toBe("NONE");
	});
});

describe("becomesStricter", () => {
	const saved = DEFAULT_BILLING_DETAILS;

	it("is true when Invoice required is switched on", () => {
		expect(becomesStricter(saved, { ...saved, invoiceRequired: true })).toBe(
			true,
		);
	});

	it("is true when a field becomes REQUIRED", () => {
		expect(
			becomesStricter(saved, {
				...saved,
				fields: {
					...saved.fields,
					vatId: { state: "REQUIRED", label: "", help: "" },
				},
			}),
		).toBe(true);
	});

	it("is false for label changes, relaxing, or a field that was already REQUIRED", () => {
		const required = {
			...saved,
			invoiceRequired: true,
			fields: {
				...saved.fields,
				city: { state: "REQUIRED" as const, label: "", help: "" },
			},
		};
		expect(
			becomesStricter(saved, {
				...saved,
				text: { label: "Invoice", help: "" },
			}),
		).toBe(false);
		expect(becomesStricter(required, saved)).toBe(false);
		expect(becomesStricter(required, required)).toBe(false);
	});
});

describe("requirednessOf", () => {
	it("keeps what decides Incomplete and drops labels, help and the organizer VAT ID", () => {
		const config = {
			...DEFAULT_BILLING_DETAILS,
			invoiceRequired: true,
			mode: "STRUCTURED" as const,
			text: { label: "Invoice", help: "Help" },
			organizerVatId: "PL6750001923",
			fields: {
				...DEFAULT_BILLING_DETAILS.fields,
				city: { state: "REQUIRED" as const, label: "Town", help: "Where" },
			},
		};
		expect(requirednessOf(config)).toEqual({
			...DEFAULT_BILLING_DETAILS,
			invoiceRequired: true,
			mode: "STRUCTURED",
			fields: {
				...DEFAULT_BILLING_DETAILS.fields,
				city: { state: "REQUIRED", label: "", help: "" },
			},
		});
	});
});

describe("previousFormValues", () => {
	const values = {
		billingText: "ACME\n1 Main St",
		billingOrganization: "ACME Institute",
		billingStreet: null,
		billingCity: "Krakow",
		vatId: "PL6750002236",
	};

	it("under Simple lists the separate fields, and the VAT ID when it is off", () => {
		expect(previousFormValues(values, DEFAULT_BILLING_DETAILS)).toEqual([
			{
				column: "billingOrganization",
				name: "Organization name",
				value: "ACME Institute",
			},
			{ column: "billingCity", name: "City", value: "Krakow" },
			{ column: "vatId", name: "VAT ID", value: "PL6750002236" },
		]);
	});

	it("under Separate fields lists the text and the fields switched off", () => {
		const structured = structuredConfig({
			organizationName: "REQUIRED",
			vatId: "OPTIONAL",
		});
		expect(previousFormValues(values, structured)).toEqual([
			{
				column: "billingText",
				name: "Billing details (text)",
				value: "ACME\n1 Main St",
			},
			{ column: "billingCity", name: "City", value: "Krakow" },
		]);
	});
});

describe("showsPreviousText", () => {
	const structured = structuredConfig({ organizationName: "REQUIRED" });

	it("shows the old text while the separate fields are still empty", () => {
		expect(showsPreviousText({ billingText: "ACME" }, structured)).toBe(true);
	});

	it("hides it once a field is filled, and in Simple mode", () => {
		expect(
			showsPreviousText(
				{ billingText: "ACME", billingOrganization: "ACME" },
				structured,
			),
		).toBe(false);
		expect(
			showsPreviousText({ billingText: "ACME" }, DEFAULT_BILLING_DETAILS),
		).toBe(false);
	});
});

describe("initialBillingText", () => {
	const fields = {
		needInvoice: true,
		billingOrganization: "ACME",
		billingCity: "Krakow",
	};

	it("starts Simple mode from the separate fields when there is no text yet", () => {
		expect(
			initialBillingText(
				{ ...fields, billingStreet: "1 Main St", billingPostalCode: "30-059" },
				DEFAULT_BILLING_DETAILS,
			),
		).toBe("ACME\n1 Main St\n30-059 Krakow");
	});

	it("leaves the hidden text empty when no invoice is wanted", () => {
		expect(
			initialBillingText(
				{ ...fields, needInvoice: false },
				DEFAULT_BILLING_DETAILS,
			),
		).toBe("");
	});

	it("keeps existing text, and stays empty under Separate fields", () => {
		expect(
			initialBillingText(
				{ ...fields, billingText: "Mine" },
				DEFAULT_BILLING_DETAILS,
			),
		).toBe("Mine");
		expect(
			initialBillingText(fields, {
				...DEFAULT_BILLING_DETAILS,
				mode: "STRUCTURED",
			}),
		).toBe("");
	});
});

describe("billingConfigFor", () => {
	const strict = withFields(
		{ organizationName: "REQUIRED", vatId: "REQUIRED" },
		{ mode: "STRUCTURED", invoiceRequired: true },
	);
	const empty = { needInvoice: false, billingOrganization: "", vatId: "" };

	it("keeps the gate for participants", () => {
		expect(
			participantBillingWrite(empty, billingConfigFor(strict, "AUTHOR")),
		).toEqual({
			error: "This field is required",
		});
	});

	it("lets an admin save without billing details", () => {
		expect(
			participantBillingWrite(empty, billingConfigFor(strict, "ADMIN")),
		).toEqual({
			needInvoice: false,
			vatId: "",
		});
	});
});
