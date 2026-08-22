import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ env: { AUTH_SECRET: "test-secret" } }));
vi.mock("@/features/settings/server/settings", () => ({
	getSetting: vi.fn(),
	setSetting: vi.fn(),
}));
vi.mock("@/shared/server/secret-box", () => ({
	open: vi.fn(() => "p12-password"),
	seal: vi.fn(() => "sealed"),
}));
vi.mock("@/shared/server/pdf-signing-client", () => ({
	generateCertificate: vi.fn(),
	inspectCertificate: vi.fn(),
	verifyPdf: vi.fn(),
}));

const { getSetting } = await import("@/features/settings/server/settings");
type SigningSettings =
	import("@/features/settings/types").DocumentSigningSettings;
const { MISSING_MATERIAL_MESSAGE, loadSigningMaterial, sanitize } =
	await import("./document-signing");

const config = (patch: Partial<SigningSettings>): SigningSettings => ({
	enabled: true,
	source: "self-signed" as const,
	subject: "CN=Test",
	fingerprintSha256: "ab:cd",
	validFrom: "2026-01-01T00:00:00.000Z",
	validUntil: "2027-01-01T00:00:00.000Z",
	passwordSealed: "sealed",
	p12Base64: Buffer.from("p12-bytes").toString("base64"),
	timestampEnabled: false,
	timestampUrl: "",
	sealReason: "",
	sealCorner: "bottom-right" as const,
	sealQrEnabled: true,
	certifying: false,
	...patch,
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("loadSigningMaterial", () => {
	it("returns null when signing is switched off", async () => {
		vi.mocked(getSetting).mockResolvedValue(config({ enabled: false }));
		await expect(loadSigningMaterial()).resolves.toBeNull();
	});

	it("returns null when nothing has been configured", async () => {
		vi.mocked(getSetting).mockResolvedValue(null);
		await expect(loadSigningMaterial()).resolves.toBeNull();
	});

	it("returns the decoded material when signing is on and stored", async () => {
		vi.mocked(getSetting).mockResolvedValue(config({}));
		const material = await loadSigningMaterial();
		expect(material?.p12.toString()).toBe("p12-bytes");
		expect(material?.password).toBe("p12-password");
	});

	// Guards the silent-unsigned-delivery path: a pre-bfeb2c8b row keeps enabled:true
	// with the P12 still in S3, and generation used to skip signing without telling anyone.
	it("throws when signing is on but the P12 is missing", async () => {
		vi.mocked(getSetting).mockResolvedValue(config({ p12Base64: "" }));
		await expect(loadSigningMaterial()).rejects.toThrow(
			MISSING_MATERIAL_MESSAGE,
		);
	});
});

describe("sanitize", () => {
	it("strips the private-key fields and reports whether a P12 is stored", () => {
		const safe = sanitize(config({}));
		expect(safe).not.toHaveProperty("p12Base64");
		expect(safe).not.toHaveProperty("passwordSealed");
		expect(safe?.hasP12).toBe(true);
	});

	it("reports a missing P12 so the settings tab can warn", () => {
		expect(sanitize(config({ p12Base64: "" }))?.hasP12).toBe(false);
	});
});
