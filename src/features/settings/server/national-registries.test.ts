import { describe, expect, it, vi } from "vitest";

vi.mock("@/logger.ts", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { queryBrreg, queryMfWhiteList, querySwissUid } =
	await import("./national-registries");

const json = (body: unknown, status = 200) =>
	vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
const xml = (body: string) =>
	vi.fn().mockResolvedValue(new Response(body, { status: 200 }));

const mfSubject = (statusCode: string) => ({
	result: {
		subject: {
			nip: "6750001923",
			statusCode,
			statusVat: "Czynny",
			requestId: "gliJb-997hfg3",
			accountNumbers: ["PL61109010140000071219812874"],
		},
	},
});

describe("queryMfWhiteList", () => {
	it("confirms an active VAT payer by bare NIP and keeps no bank accounts", async () => {
		const transport = json(mfSubject("C"));
		const result = await queryMfWhiteList("PL6750001923", transport);
		expect(transport.mock.calls[0][0]).toMatch(
			/^https:\/\/wl-api\.mf\.gov\.pl\/api2\/status\/nip\/6750001923\?date=\d{4}-\d{2}-\d{2}$/,
		);
		expect(result).toEqual({
			status: "VERIFIED",
			registryName: null,
			registryAddress: null,
			requestIdentifier: "gliJb-997hfg3",
		});
	});

	it("also confirms a VAT-exempt payer (status Z), who is in the register", async () => {
		expect(
			(await queryMfWhiteList("PL6750001923", json(mfSubject("Z")))).status,
		).toBe("VERIFIED");
	});

	it("reports a NIP outside the VAT register as NOT_FOUND", async () => {
		expect(
			(await queryMfWhiteList("PL1111111111", json(mfSubject("B")))).status,
		).toBe("NOT_FOUND");
	});

	it("reports UNAVAILABLE when the service fails", async () => {
		expect(
			(await queryMfWhiteList("PL6750001923", json({ code: "WL-190" }, 400)))
				.status,
		).toBe("UNAVAILABLE");
	});
});

describe("querySwissUid", () => {
	const envelope = (value: string) =>
		`<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><ValidateVatNumberResponse xmlns="http://www.uid.admin.ch/xmlns/uid-wse"><ValidateVatNumberResult>${value}</ValidateVatNumberResult></ValidateVatNumberResponse></s:Body></s:Envelope>`;

	it("posts ValidateVatNumber and verifies on true", async () => {
		const transport = xml(envelope("true"));
		const result = await querySwissUid("CHE116281710", transport);
		expect(transport.mock.calls[0][1].body).toContain(
			"<uid:vatNumber>CHE116281710</uid:vatNumber>",
		);
		expect(result.status).toBe("VERIFIED");
	});

	it("reports NOT_FOUND on false", async () => {
		expect(
			(await querySwissUid("CHE116281710", xml(envelope("false")))).status,
		).toBe("NOT_FOUND");
	});

	it("reports UNAVAILABLE on a SOAP fault", async () => {
		expect(
			(await querySwissUid("CHE116281710", xml("<s:Fault>busy</s:Fault>")))
				.status,
		).toBe("UNAVAILABLE");
	});
});

describe("queryBrreg", () => {
	const unit = (mva: boolean) => ({
		navn: "UIT NORGES ARKTISKE UNIVERSITET",
		registrertIMvaregisteret: mva,
		forretningsadresse: {
			adresse: ["Hansine Hansens veg 18"],
			postnummer: "9019",
			poststed: "TROMSØ",
		},
	});

	it("verifies an org in the VAT register with its name and address", async () => {
		const transport = json(unit(true));
		expect(await queryBrreg("NO970422528", transport)).toEqual({
			status: "VERIFIED",
			registryName: "UIT NORGES ARKTISKE UNIVERSITET",
			registryAddress: "Hansine Hansens veg 18\n9019 TROMSØ",
			requestIdentifier: null,
		});
		expect(transport.mock.calls[0][0]).toBe(
			"https://data.brreg.no/enhetsregisteret/api/enheter/970422528",
		);
	});

	it("reports an org outside the VAT register as NOT_FOUND", async () => {
		expect((await queryBrreg("NO970422528", json(unit(false)))).status).toBe(
			"NOT_FOUND",
		);
	});

	it("reports unknown and deleted orgs as NOT_FOUND", async () => {
		expect((await queryBrreg("NO970422528", json({}, 404))).status).toBe(
			"NOT_FOUND",
		);
		expect((await queryBrreg("NO970422528", json({}, 410))).status).toBe(
			"NOT_FOUND",
		);
	});

	it("reports UNAVAILABLE on a server error", async () => {
		expect((await queryBrreg("NO970422528", json({}, 503))).status).toBe(
			"UNAVAILABLE",
		);
	});
});
