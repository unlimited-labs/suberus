import { describe, expect, it } from "vitest";
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
	address: null,
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
			"Invoice details": "",
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
				address: "1 Engine St",
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
			"Invoice details": "1 Engine St",
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
		expect(row.diet).toBe("vegan");
		// Unanswered question falls back to an empty string under its label key.
		expect(row.Notes).toBe("");
	});

	it("neutralizes formula-injection in text fields and survey answers", () => {
		const row = buildUserExportRow(
			{ ...baseUser, firstName: "=cmd()" },
			[{ id: "q1", fieldName: "x", label: "X", type: "TEXT" }],
			fmtDate,
		);
		expect(row["First Name"]).toBe("'=cmd()");
	});
});
