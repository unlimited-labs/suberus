import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM at-rest encryption for small secrets (the document-signing P12
// password). Pure: the caller passes a 32-byte key (derive it from a long-lived
// app secret). Sealed form = base64(iv ‖ tag ‖ ciphertext).
// ponytail: caller-supplied key keeps this env-free and unit-testable; swap the
// caller's key source for a KMS/HSM if key rotation ever becomes a requirement.

export function seal(key: Buffer, plain: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function open(key: Buffer, sealed: string): string {
	const buf = Buffer.from(sealed, "base64");
	const iv = buf.subarray(0, 12);
	const tag = buf.subarray(12, 28);
	const ct = buf.subarray(28);
	const decipher = createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
		"utf8",
	);
}
