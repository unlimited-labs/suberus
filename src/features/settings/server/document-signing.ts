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
import type { DocumentSigningSettings } from "../types";

function signingKey(): Buffer {
	return createHash("sha256").update(env.AUTH_SECRET).digest();
}

/** Decode the stored P12 bytes and unseal its password. */
function decodeP12(cfg: DocumentSigningSettings) {
	return {
		p12: Buffer.from(cfg.p12Base64, "base64"),
		password: open(signingKey(), cfg.passwordSealed),
	};
}

export async function getSigningConfig(): Promise<DocumentSigningSettings | null> {
	return getSetting("DOCUMENT_SIGNING");
}

/** Client-facing view: never expose the sealed P12 password or the P12 itself. */
export type SafeSigningConfig = Omit<
	DocumentSigningSettings,
	"passwordSealed" | "p12Base64"
>;

export function sanitize(
	cfg: DocumentSigningSettings | null,
): SafeSigningConfig | null {
	if (!cfg) return null;
	const { passwordSealed: _pw, p12Base64: _p12, ...safe } = cfg;
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
	| "certifying"
> {
	return {
		timestampEnabled: prev?.timestampEnabled ?? false,
		timestampUrl: prev?.timestampUrl ?? "",
		sealReason: prev?.sealReason ?? "",
		sealCorner: prev?.sealCorner ?? "bottom-right",
		sealQrEnabled: prev?.sealQrEnabled ?? true,
		certifying: prev?.certifying ?? false,
	};
}

async function persistCert(
	p12: Buffer,
	password: string,
	metadata: CertMetadata,
	source: "self-signed" | "uploaded",
): Promise<SafeSigningConfig> {
	const prev = await getSigningConfig();
	const cfg: DocumentSigningSettings = {
		enabled: prev?.enabled ?? false,
		source,
		subject: metadata.subject,
		fingerprintSha256: metadata.fingerprintSha256,
		validFrom: metadata.validFrom,
		validUntil: metadata.validUntil,
		passwordSealed: seal(signingKey(), password),
		p12Base64: p12.toString("base64"),
		...appearanceDefaults(prev),
	};
	await setSetting("DOCUMENT_SIGNING", cfg);
	// SAFETY: sanitize strips the private-key fields, which is what makes it Safe.
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
	// SAFETY: sanitize strips the private-key fields, which is what makes it Safe.
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
	certifying: boolean;
}): Promise<SafeSigningConfig> {
	return updateConfig(patch);
}

/** Public certificate PEM for the "download .cer" button (no private key). */
export async function getPublicCertPem(): Promise<string | null> {
	const cfg = await getSigningConfig();
	if (!cfg?.p12Base64) return null;
	const { p12, password } = decodeP12(cfg);
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
	// Legacy rows (P12 in S3, pre-DB-storage) have no p12Base64 → treat as
	// unconfigured; regenerating the cert repopulates it.
	if (!cfg?.enabled || !cfg.p12Base64) return null;
	return { cfg, ...decodeP12(cfg) };
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
