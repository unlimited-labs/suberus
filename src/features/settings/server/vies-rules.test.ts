import { describe, expect, it } from "vitest";
import { mapViesResponse } from "./vies-rules";

describe("mapViesResponse", () => {
	it("verifies a valid number and keeps only name and address", () => {
		expect(
			mapViesResponse({
				countryCode: "PL",
				vatNumber: "6750001923",
				valid: true,
				requestIdentifier: "WAPIAAAAZ1",
				name: "AKADEMIA GÓRNICZO-HUTNICZA",
				address: "AL. ADAMA MICKIEWICZA 30\n30-059 KRAKÓW",
				traderName: "---",
			}),
		).toEqual({
			status: "VERIFIED",
			registryName: "AKADEMIA GÓRNICZO-HUTNICZA",
			registryAddress: "AL. ADAMA MICKIEWICZA 30\n30-059 KRAKÓW",
			requestIdentifier: "WAPIAAAAZ1",
		});
	});

	it("drops the '---' placeholders of states that withhold name and address", () => {
		expect(
			mapViesResponse({
				valid: true,
				name: "---",
				address: "---",
				requestIdentifier: "",
			}),
		).toEqual({
			status: "VERIFIED",
			registryName: null,
			registryAddress: null,
			requestIdentifier: null,
		});
	});

	it("reports an unknown number as NOT_FOUND", () => {
		expect(
			mapViesResponse({ valid: false, name: "", address: "" }).status,
		).toBe("NOT_FOUND");
	});

	it("reads MS_UNAVAILABLE from userError although isValid is false", () => {
		expect(
			mapViesResponse({ isValid: false, userError: "MS_UNAVAILABLE" }).status,
		).toBe("UNAVAILABLE");
	});

	it("reads an unavailable state from the POST error wrapper", () => {
		expect(
			mapViesResponse({
				actionSucceed: false,
				errorWrappers: [{ error: "MS_MAX_CONCURRENT_REQ" }],
			}).status,
		).toBe("UNAVAILABLE");
	});

	it("treats an answer without a validity flag as UNAVAILABLE, not NOT_FOUND", () => {
		expect(mapViesResponse({ name: "ACME" }).status).toBe("UNAVAILABLE");
	});

	it("reports a number VIES rejects as input as NOT_FOUND", () => {
		expect(
			mapViesResponse({
				actionSucceed: false,
				errorWrappers: [{ error: "INVALID_INPUT" }],
			}).status,
		).toBe("NOT_FOUND");
	});
});
