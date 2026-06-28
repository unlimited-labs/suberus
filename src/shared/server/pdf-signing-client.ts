// fallow-ignore-file security-sink
// Outbound fetch origin is env.DOCX_API_URL (internal sidecar, operator config),
// never request-derived — not an SSRF surface.
import { env } from "@/env";
import { docxApiAuthHeaders } from "@/shared/server/docx-api-auth";

// HTTP client for the docx-api sidecar's signing endpoints (pyHanko). The app
// owns the cert lifecycle; the sidecar is stateless and receives the P12 +
// password on every sign request. Mirrors docx-pdf-client.ts.

const GEN_TIMEOUT_MS = 30_000;
const SIGN_TIMEOUT_MS = 60_000;

function base(): string {
	if (!env.DOCX_API_URL) throw new Error("DOCX_API_URL is not configured");
	return env.DOCX_API_URL.replace(/\/+$/, "");
}

export interface CertMetadata {
	subject: string;
	commonName: string;
	org: string;
	fingerprintSha256: string;
	validFrom: string;
	validUntil: string;
	serial: string;
}

async function post(
	path: string,
	body: BodyInit,
	timeoutMs: number,
): Promise<Response> {
	let res: Response;
	try {
		res = await fetch(`${base()}${path}`, {
			method: "POST",
			body,
			headers: docxApiAuthHeaders(),
			signal: AbortSignal.timeout(timeoutMs),
		});
	} catch (e) {
		if (e instanceof Error && e.name === "TimeoutError") {
			throw new Error(`docx-api ${path} timed out after ${timeoutMs}ms`);
		}
		throw e;
	}
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`docx-api ${path} failed: ${res.status} ${detail.slice(0, 300)}`.trim(),
		);
	}
	return res;
}

export async function generateCertificate(opts: {
	commonName: string;
	org: string;
	validDays: number;
}): Promise<{
	p12: Buffer;
	password: string;
	metadata: CertMetadata;
	certPem: string;
}> {
	const res = await post(
		"/v1/gen-cert",
		new Blob([JSON.stringify(opts)], { type: "application/json" }),
		GEN_TIMEOUT_MS,
	);
	const data = (await res.json()) as {
		p12Base64: string;
		password: string;
		metadata: CertMetadata;
		certPem: string;
	};
	return {
		p12: Buffer.from(data.p12Base64, "base64"),
		password: data.password,
		metadata: data.metadata,
		certPem: data.certPem,
	};
}

export async function inspectCertificate(
	p12: Buffer,
	password: string,
): Promise<{ metadata: CertMetadata; certPem: string }> {
	const form = new FormData();
	form.append("p12", new Blob([new Uint8Array(p12)]), "cert.p12");
	form.append("password", password);
	const res = await post("/v1/inspect-cert", form, GEN_TIMEOUT_MS);
	return (await res.json()) as { metadata: CertMetadata; certPem: string };
}

export interface SignOptions {
	p12: Buffer;
	password: string;
	reason?: string;
	location?: string;
	corner?: string;
	qrUrl?: string;
	timestampUrl?: string;
	certify?: boolean;
}

export async function signPdf(pdf: Buffer, opts: SignOptions): Promise<Buffer> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(pdf)]), "document.pdf");
	form.append("p12", new Blob([new Uint8Array(opts.p12)]), "cert.p12");
	form.append("password", opts.password);
	form.append("reason", opts.reason ?? "");
	form.append("location", opts.location ?? "");
	form.append("corner", opts.corner ?? "bottom-right");
	form.append("qrUrl", opts.qrUrl ?? "");
	form.append("timestampUrl", opts.timestampUrl ?? "");
	form.append("certify", opts.certify ? "true" : "false");
	const res = await post("/v1/sign-pdf", form, SIGN_TIMEOUT_MS);
	return Buffer.from(await res.arrayBuffer());
}

export interface VerifyResult {
	signed: boolean;
	valid: boolean;
	intact: boolean;
	signerSubject?: string;
	signerFingerprintSha256?: string;
	signedAt?: string | null;
	timestamped?: boolean;
	reason: string;
	/** Set by the app layer: signer cert matches the conference's configured cert. */
	matchesConfiguredCert?: boolean;
}

export async function verifyPdf(pdf: Buffer): Promise<VerifyResult> {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(pdf)]), "document.pdf");
	const res = await post("/v1/verify-pdf", form, SIGN_TIMEOUT_MS);
	return (await res.json()) as VerifyResult;
}
