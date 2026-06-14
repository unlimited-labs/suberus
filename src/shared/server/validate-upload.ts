import { fileTypeFromBuffer } from "file-type";

/**
 * Thrown when an uploaded buffer fails server-side validation. Callers should
 * surface `message` to the user; it never leaks internal detail.
 */
export class UploadValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UploadValidationError";
	}
}

interface ValidateUploadOptions {
	/** Extensions (as reported by `file-type`) the caller accepts. */
	allowedExtensions: readonly string[];
	/** Hard size ceiling in bytes. */
	maxBytes: number;
}

export interface DetectedFile {
	ext: string;
	mime: string;
}

/**
 * Validate an uploaded buffer by its magic number — never by the
 * client-supplied name or Content-Type, both of which are forgeable.
 *
 * Checks, in order: non-empty, within size limit, a recognizable signature,
 * and that the detected type is on the allowlist. Returns the detected
 * `{ ext, mime }` so callers persist the trustworthy values instead of the
 * client's.
 *
 * Note: formats without a magic number (plain text, SVG, CSV) are reported as
 * `undefined` by `file-type` and therefore rejected. This is intentional for
 * the document/image uploads here; do not reuse this for text formats.
 */
export async function validateUpload(
	buffer: Buffer,
	{ allowedExtensions, maxBytes }: ValidateUploadOptions,
): Promise<DetectedFile> {
	if (buffer.length === 0) {
		throw new UploadValidationError("The uploaded file is empty.");
	}
	if (buffer.length > maxBytes) {
		const maxMb = Math.round(maxBytes / (1024 * 1024));
		throw new UploadValidationError(`File exceeds the ${maxMb}MB limit.`);
	}

	const detected = await fileTypeFromBuffer(buffer);
	if (!detected) {
		throw new UploadValidationError(
			"Unrecognized file format. Allowed: " +
				allowedExtensions.map((e) => e.toUpperCase()).join(", "),
		);
	}
	if (!allowedExtensions.includes(detected.ext)) {
		throw new UploadValidationError(
			`File type .${detected.ext} is not allowed. Allowed: ` +
				allowedExtensions.map((e) => e.toUpperCase()).join(", "),
		);
	}

	return { ext: detected.ext, mime: detected.mime };
}
