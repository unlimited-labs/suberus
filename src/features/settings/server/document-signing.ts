import { createHash } from "node:crypto";
import { env } from "@/env";
import { getSetting, setSetting } from "@/features/settings/server/settings";
import type {
	CertMetadata,
	VerifyResult,
} from "@/shared/server/pdf-signing-client";
import {
	generateCertificate,
	inspectCertificate,
	verifyPdf,
} from "@/shared/server/pdf-signing-client";
import { open, seal } from "@/shared/server/secret-box";
import { getFileBuffer, uploadFile } from "@/shared/server/storage";
import type { DocumentSigningSettings } from "../types";

/** Public S3 storage is private here — same access control as templates. */
const P12_KEY = "documents/signing/cert.p12";
/** Free public RFC3161 TSA prefilled when the operator enables timestamping. */
export const DEFAULT_TSA_URL = "https://freetsa.org/tsr";

function signingKey(): Buffer {
	return createHash("sha256").update(env.AUTH_SECRET).digest();
}

export async function getSigningConfig(): Promise<DocumentSigningSettings | null> {
	return getSetting("DOCUMENT_SIGNING");
}

/** Client-facing view: never expose the sealed P12 password. */
export type SafeSigningConfig = Omit<DocumentSigningSettings, "passwordSealed">;

export function sanitize(
	cfg: DocumentSigningSettings | null,
): SafeSigningConfig | null {
	if (!cfg) return null;
	const { passwordSealed: _omit, ...safe } = cfg;
	return safe;
}

/** Appearance/timestamp defaults preserved across cert regeneration. */
function appearanceDefaults(
	prev: DocumentSigningSettings | null,
): Pick<
	DocumentSigningSettings,
	| "timestampEnabled"
	| "timestampUrl"
	| "sealReason"
	| "sealCorner"
	| "sealQrEnabled"
	| "sealLogoEnabled"
	| "certifying"
> {
	return {
		timestampEnabled: prev?.timestampEnabled ?? false,
		timestampUrl: prev?.timestampUrl ?? "",
		sealReason: prev?.sealReason ?? "",
		sealCorner: prev?.sealCorner ?? "bottom-right",
		sealQrEnabled: prev?.sealQrEnabled ?? true,
		sealLogoEnabled: prev?.sealLogoEnabled ?? false,
		certifying: prev?.certifying ?? false,
	};
}

async function persistCert(
	p12: Buffer,
	password: string,
	metadata: CertMetadata,
	source: "self-signed" | "uploaded",
): Promise<SafeSigningConfig> {
	await uploadFile(p12, P12_KEY, "application/x-pkcs12");
	const prev = await getSigningConfig();
	const cfg: DocumentSigningSettings = {
		enabled: prev?.enabled ?? false,
		source,
		subject: metadata.subject,
		fingerprintSha256: metadata.fingerprintSha256,
		validFrom: metadata.validFrom,
		validUntil: metadata.validUntil,
		passwordSealed: seal(signingKey(), password),
		...appearanceDefaults(prev),
	};
	await setSetting("DOCUMENT_SIGNING", cfg);
	return sanitize(cfg) as SafeSigningConfig;
}

export async function generateAndStoreCert(opts: {
	commonName: string;
	org: string;
	validDays: number;
}): Promise<SafeSigningConfig> {
	const { p12, password, metadata } = await generateCertificate(opts);
	return persistCert(p12, password, metadata, "self-signed");
}

export async function uploadAndStoreCert(
	p12: Buffer,
	password: string,
): Promise<SafeSigningConfig> {
	const { metadata } = await inspectCertificate(p12, password);
	// Re-seal the user-supplied password (inspect already proved it opens the P12).
	return persistCert(p12, password, metadata, "uploaded");
}

async function updateConfig(
	patch: Partial<DocumentSigningSettings>,
): Promise<SafeSigningConfig> {
	const prev = await getSigningConfig();
	if (!prev) throw new Error("No signing certificate has been configured yet.");
	const next = { ...prev, ...patch };
	await setSetting("DOCUMENT_SIGNING", next);
	return sanitize(next) as SafeSigningConfig;
}

export async function setEnabled(enabled: boolean): Promise<SafeSigningConfig> {
	return updateConfig({ enabled });
}

export async function setTimestamp(
	timestampEnabled: boolean,
	timestampUrl: string,
): Promise<SafeSigningConfig> {
	return updateConfig({ timestampEnabled, timestampUrl });
}

export async function setAppearance(patch: {
	sealReason: string;
	sealCorner: DocumentSigningSettings["sealCorner"];
	sealQrEnabled: boolean;
	sealLogoEnabled: boolean;
	certifying: boolean;
}): Promise<SafeSigningConfig> {
	return updateConfig(patch);
}

/** Public certificate PEM for the "download .cer" button (no private key). */
export async function getPublicCertPem(): Promise<string | null> {
	const cfg = await getSigningConfig();
	if (!cfg) return null;
	const p12 = await getFileBuffer(P12_KEY);
	const password = open(signingKey(), cfg.passwordSealed);
	const { certPem } = await inspectCertificate(p12, password);
	return certPem;
}

/** Worker side: everything needed to sign one PDF, or null when off/unconfigured. */
export async function loadSigningMaterial(): Promise<{
	cfg: DocumentSigningSettings;
	p12: Buffer;
	password: string;
} | null> {
	const cfg = await getSigningConfig();
	if (!cfg?.enabled) return null;
	const p12 = await getFileBuffer(P12_KEY);
	const password = open(signingKey(), cfg.passwordSealed);
	return { cfg, p12, password };
}

export async function verifyDocument(pdf: Buffer): Promise<VerifyResult> {
	const result = await verifyPdf(pdf);
	// Stronger signal: does the signer cert match THIS conference's certificate?
	// Informational only — old documents signed with a rotated-out cert still verify.
	const cfg = await getSigningConfig();
	const matchesConfiguredCert = Boolean(
		cfg &&
			result.signerFingerprintSha256 &&
			cfg.fingerprintSha256 === result.signerFingerprintSha256,
	);
	return { ...result, matchesConfiguredCert };
}
