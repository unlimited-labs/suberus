import { describe, expect, it } from "vitest";
import { findVatIdInText, normalizeVatId } from "./vat-id";

describe("normalizeVatId", () => {
	it("uppercases and strips spaces, dashes and dots, keeping the prefix", () => {
		expect(normalizeVatId("pl 675-000-22-36")).toEqual({
			value: "PL6750002236",
		});
	});

	it("takes the prefix from the participant's country when it is missing", () => {
		expect(normalizeVatId("675-000-22-36", "Poland")).toEqual({
			value: "PL6750002236",
		});
	});

	it("uses EL for Greece, whether typed as GR or inferred", () => {
		expect(normalizeVatId("GR094259216")).toEqual({ value: "EL094259216" });
		expect(normalizeVatId("094259216", "Greece")).toEqual({
			value: "EL094259216",
		});
	});

	it("infers the Swiss CHE and Norwegian NO prefixes from the country", () => {
		expect(normalizeVatId("116.281.710", "Switzerland")).toEqual({
			value: "CHE116281710",
		});
		expect(normalizeVatId("995 525 828", "Norway")).toEqual({
			value: "NO995525828",
		});
	});

	it("checks XI numbers with the GB algorithm", () => {
		expect(normalizeVatId("XI 980 7806 84")).toEqual({ value: "XI980780684" });
	});

	it.each([
		["DE136695976", "DE136695976"],
		["CHE-116.281.710 MWST", "CHE116281710"],
		["CHE116281710", "CHE116281710"],
		["NO 995 525 828 MVA", "NO995525828"],
		["NO995525828", "NO995525828"],
		["DE 136/695/976", "DE136695976"],
		["GB980780684", "GB980780684"],
		["AD U-132950-X", "ADU132950X"],
	])("accepts a valid %s", (input, value) => {
		expect(normalizeVatId(input)).toEqual({ value });
	});

	it.each(["DE136695977", "PL6750002237", "GB980780685"])(
		"rejects a bad checksum in %s",
		(input) => {
			expect(normalizeVatId(input)).toHaveProperty("error");
		},
	);

	it("rejects a bad checksum after inferring the prefix", () => {
		expect(normalizeVatId("6750002237", "Poland")).toHaveProperty("error");
	});

	it("stores numbers of unsupported countries as typed, trimmed and uppercased", () => {
		expect(normalizeVatId(" 12-345 678 ", "United States")).toEqual({
			value: "12-345 678",
		});
	});

	it("rejects stray characters or overlong input where no checksum applies", () => {
		expect(normalizeVatId("12#45", "United States")).toHaveProperty("error");
		expect(normalizeVatId("1".repeat(21), "United States")).toHaveProperty(
			"error",
		);
	});

	it("returns an empty value for empty input", () => {
		expect(normalizeVatId("  ")).toEqual({ value: "" });
	});
});

describe("findVatIdInText", () => {
	it("finds a prefixed VAT ID with a valid check digit inside free text", () => {
		expect(
			findVatIdInText(
				"Uniwersytet Jagiellonski\nGolebia 24\nVAT: PL 675-000-22-36",
			),
		).toBe("PL6750002236");
	});

	it("finds a bare number using the country", () => {
		expect(findVatIdInText("NIP 675-000-22-36", "Poland")).toBe("PL6750002236");
	});

	it("ignores numbers that fail the check digit, like postal codes and phones", () => {
		expect(
			findVatIdInText("30-059 Krakow, tel. +48 12 345 67 89"),
		).toBeUndefined();
	});
});
