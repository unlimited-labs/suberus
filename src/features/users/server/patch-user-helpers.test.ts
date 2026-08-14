import { describe, expect, it } from "vitest";
import {
	extractFeePayment,
	type PatchUserData,
	selectFeeType,
	summarizeUserChanges,
} from "./patch-user-helpers";

const base: PatchUserData = { id: "u1" };

describe("extractFeePayment", () => {
	it("returns the payload when all fee fields are present", () => {
		expect(
			extractFeePayment({
				...base,
				markFeePaid: true,
				feeType: "regular",
				feeAmount: 100,
				feeCurrency: "PLN",
			}),
		).toEqual({ feeType: "regular", amount: 100, currency: "PLN" });
	});

	it("accepts a zero amount", () => {
		const r = extractFeePayment({
			...base,
			markFeePaid: true,
			feeType: "waived",
			feeAmount: 0,
			feeCurrency: "PLN",
		});
		expect(r).toEqual({ feeType: "waived", amount: 0, currency: "PLN" });
	});

	it("returns null when markFeePaid is not set", () => {
		expect(
			extractFeePayment({
				...base,
				feeType: "regular",
				feeAmount: 100,
				feeCurrency: "PLN",
			}),
		).toBeNull();
	});

	it("returns null when any fee field is missing", () => {
		expect(
			extractFeePayment({ ...base, markFeePaid: true, feeType: "regular" }),
		).toBeNull();
		expect(
			extractFeePayment({
				...base,
				markFeePaid: true,
				feeAmount: 100,
				feeCurrency: "PLN",
			}),
		).toBeNull();
	});
});

describe("summarizeUserChanges", () => {
	it("is empty when nothing changed", () => {
		expect(summarizeUserChanges(base)).toBe("");
	});

	it("lists each changed field", () => {
		expect(
			summarizeUserChanges({
				...base,
				role: "ADMIN",
				isActive: false,
				allowLateSubmission: true,
				markFeePaid: true,
				unmarkFeePaid: true,
				verifyEmail: true,
			}),
		).toBe(
			"role=ADMIN, active=false, allowLateSubmission=true, feePaid, feeUnpaid, emailVerified",
		);
	});

	it("includes boolean false values for active/late flags", () => {
		expect(summarizeUserChanges({ ...base, isActive: false })).toBe(
			"active=false",
		);
		expect(summarizeUserChanges({ ...base, allowLateSubmission: false })).toBe(
			"allowLateSubmission=false",
		);
	});
});

describe("selectFeeType", () => {
	const full = { name: "Full Conference Fee", amount: 250 };
	const student = { name: "Student Fee", amount: 100 };

	it("takes the only configured type when none is named", () => {
		expect(selectFeeType([full])).toEqual({ type: full });
	});

	it("refuses to guess between several types", () => {
		const result = selectFeeType([full, student]);
		expect(result).toEqual({
			error:
				"Several fee types are configured, name one: Full Conference Fee, Student Fee",
		});
	});

	it("matches a named type", () => {
		expect(selectFeeType([full, student], "Student Fee")).toEqual({
			type: student,
		});
	});

	it("lists the valid names when the name is unknown", () => {
		expect(selectFeeType([full, student], "student")).toEqual({
			error:
				'Unknown fee type "student". Configured: Full Conference Fee, Student Fee',
		});
	});

	it("reports an unconfigured conference", () => {
		expect(selectFeeType([])).toEqual({ error: "No fee types are configured" });
	});
});
