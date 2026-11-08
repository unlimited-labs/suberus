import { describe, expect, it } from "vitest";
import { z } from "zod";
import { applyBillingConfig } from "./billing-details-rules";
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
