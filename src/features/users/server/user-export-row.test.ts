import { describe, expect, it } from "vitest";
import { lookup } from "@/shared/lib/lookup";
import {
	buildUserExportRow,
	type ExportQuestion,
	type ExportUser,
} from "./user-export-row";

const fmtDate = (d: Date | null | undefined) => (d ? "FORMATTED" : "");

const baseUser: ExportUser = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	title: "Dr",
	affiliation: "Analytical Engine Lab",
	role: "AUTHOR",
	submissionRoles: [],
	isActive: true,
	needInvoice: false,
	billingText: null,
	billingOrganization: null,
	billingStreet: null,
	billingPostalCode: null,
	billingCity: null,
	vatId: null,
	vatIdCheck: null,
	country: null,
	createdAt: new Date("2026-01-02"),
	lastLoginAt: null,
	fee: null,
	surveyAnswers: [],
};

describe("buildUserExportRow", () => {
	it("maps the fixed columns with fallbacks", () => {
		const row = buildUserExportRow(baseUser, [], fmtDate);
		expect(row).toMatchObject({
			"First Name": "Ada",
			"Last Name": "Lovelace",
			Email: "ada@example.com",
			Title: "Dr",
			Affiliation: "Analytical Engine Lab",
			Role: "AUTHOR",
			Submissions: "",
			Status: "Active",
			"Fee Status": "Unpaid",
			"Fee Type": "",
			"Fee Paid At": "",
			"Need Invoice": "False",
			"Billing details (text)": "",
			"VAT ID status": "",
			"VAT ID checked at": "",
			"Registry name": "",
			"Registration Date": "FORMATTED",
			"Last Login": "",
		});
	});

	it("reflects inactive status, paid fee and invoice need", () => {
		const row = buildUserExportRow(
			{
				...baseUser,
				isActive: false,
				needInvoice: true,
				billingText: "1 Engine St",
				fee: {
					id: "fee1",
					userId: "u1",
					paid: true,
					type: "regular",
					amount: 100,
					currency: "PLN",
					paidAt: new Date("2026-02-03"),
				},
			},
			[],
			fmtDate,
		);
		expect(row).toMatchObject({
			Status: "Inactive",
			"Fee Status": "Paid",
			"Fee Type": "regular",
			"Fee Paid At": "FORMATTED",
			"Need Invoice": "True",
			"Billing details (text)": "1 Engine St",
		});
	});

	it("keeps the fixed billing column order whatever the form", () => {
		const keys = Object.keys(buildUserExportRow(baseUser, [], fmtDate));
		const start = keys.indexOf("Need Invoice");
		expect(keys.slice(start, start + 11)).toEqual([
			"Need Invoice",
			"Billing details (text)",
			"Organization name",
			"Street address",
			"Postal code",
			"City",
			"Country",
			"VAT ID",
			"VAT ID status",
			"VAT ID checked at",
			"Registry name",
		]);
	});

	it("exports the separate billing fields and the country", () => {
		const row = buildUserExportRow(
			{
				...baseUser,
				billingOrganization: "ACME Institute",
				billingStreet: "1 Main St",
				billingPostalCode: "30-059",
				billingCity: "Krakow",
				country: "Poland",
				vatId: "PL6750002236",
				vatIdCheck: {
					status: "VERIFIED",
					checkedAt: new Date("2026-11-08"),
					registryName: "UNIWERSYTET JAGIELLOŃSKI",
				},
			},
			[],
			fmtDate,
		);
		expect(row).toMatchObject({
			"VAT ID": "PL6750002236",
			"VAT ID status": "Verified",
			"VAT ID checked at": "FORMATTED",
			"Registry name": "UNIWERSYTET JAGIELLOŃSKI",
			"Organization name": "ACME Institute",
			"Street address": "1 Main St",
			"Postal code": "30-059",
			City: "Krakow",
			Country: "Poland",
		});
	});

	it("emits a survey column per question, keyed by fieldName then label", () => {
		const questions: ExportQuestion[] = [
			{ id: "q1", fieldName: "diet", label: "Diet", type: "TEXT" },
			{ id: "q2", fieldName: null, label: "Notes", type: "TEXT" },
		];
		const row = buildUserExportRow(
			{
				...baseUser,
				surveyAnswers: [{ questionId: "q1", value: "vegan" }],
			},
			questions,
			fmtDate,
		);
		expect(lookup(row, "diet")).toBe("vegan");
		expect(lookup(row, "Notes")).toBe("");
	});

	it("leaves a formula-looking value intact for the xlsx writer", () => {
		const row = buildUserExportRow(
			{ ...baseUser, firstName: "=cmd()" },
			[{ id: "q1", fieldName: "x", label: "X", type: "TEXT" }],
			fmtDate,
		);
		expect(row["First Name"]).toBe("=cmd()");
	});
});
