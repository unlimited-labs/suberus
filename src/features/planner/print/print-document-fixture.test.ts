import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { printDocumentSchema } from "./print-document-schema";

describe("shared PrintDocument fixture", () => {
	it("is a valid PrintDocument for the IDML sidecar contract (pytest checks the same file against Pydantic)", () => {
		const raw = JSON.parse(
			readFileSync(
				"services/docx-api/test_fixtures/print-document.json",
				"utf8",
			),
		);
		expect(printDocumentSchema.safeParse(raw).success).toBe(true);
	});
});
