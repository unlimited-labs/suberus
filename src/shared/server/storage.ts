import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import filenamify from "filenamify";
import latinize from "latinize";
import { env } from "@/env";
import { logger } from "@/logger.ts";

// S3-compatible object storage env (GARAGE_* honored as deprecated aliases)
const S3_ENDPOINT = env.S3_ENDPOINT ?? env.GARAGE_ENDPOINT;
const S3_ACCESS_KEY_ID = env.S3_ACCESS_KEY_ID ?? env.GARAGE_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY =
	env.S3_SECRET_ACCESS_KEY ?? env.GARAGE_SECRET_ACCESS_KEY;
const S3_BUCKET = env.S3_BUCKET ?? env.GARAGE_BUCKET;

// Validate required environment variables
function validateEnv(): void {
	if (!S3_ENDPOINT) {
		throw new Error("S3_ENDPOINT environment variable is required");
	}
	if (!S3_ACCESS_KEY_ID) {
		throw new Error("S3_ACCESS_KEY_ID environment variable is required");
	}
	if (!S3_SECRET_ACCESS_KEY) {
		throw new Error("S3_SECRET_ACCESS_KEY environment variable is required");
	}
	if (!S3_BUCKET) {
		throw new Error("S3_BUCKET environment variable is required");
	}
}

// Lazy initialization of S3 client
let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
	if (!_s3Client) {
		validateEnv();
		_s3Client = new S3Client({
			endpoint: S3_ENDPOINT,
			region: env.S3_REGION,
			credentials: {
				accessKeyId: S3_ACCESS_KEY_ID as string,
				secretAccessKey: S3_SECRET_ACCESS_KEY as string,
			},
			forcePathStyle: true, // Required for path-style S3 backends (Garage/MinIO)
		});
	}
	return _s3Client;
}

/**
 * Upload a file to S3-compatible storage
 * @param buffer - File content as Buffer
 * @param key - Storage key (path in bucket)
 * @param mimeType - File MIME type
 * @returns Storage key for reference
 */
export async function uploadFile(
	buffer: Buffer,
	key: string,
	mimeType: string,
): Promise<string> {
	const client = getS3Client();

	const command = new PutObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
		Body: buffer,
		ContentType: mimeType,
	});

	await client.send(command);
	logger.info(`[s3] uploaded ${key}`);
	return key;
}

/**
 * Get a pre-signed download URL for a file
 * @param key - Storage key
 * @param expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns Pre-signed download URL
 */
export async function getFileDownloadUrl(
	key: string,
	expiresIn = 3600,
): Promise<string> {
	const client = getS3Client();

	const command = new GetObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
	});

	return getSignedUrl(client, command, { expiresIn });
}

/**
 * Get file content from S3 as a Web ReadableStream (for HTTP responses).
 */
export async function getFileContent(key: string): Promise<{
	body: ReadableStream;
	contentType: string;
	contentLength: number;
}> {
	const client = getS3Client();

	const command = new GetObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
	});

	const response = await client.send(command);
	if (!response.Body) throw new Error(`S3 returned empty body for key: ${key}`);

	return {
		body: response.Body.transformToWebStream(),
		contentType: response.ContentType ?? "application/octet-stream",
		contentLength: response.ContentLength ?? 0,
	};
}

/**
 * Get file content as a Buffer (for server-side processing).
 * Uses AWS SDK's transformToByteArray which handles both Node and Web streams.
 */
export async function getFileBuffer(key: string): Promise<Buffer> {
	const client = getS3Client();

	const command = new GetObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
	});

	const response = await client.send(command);
	if (!response.Body) throw new Error(`S3 returned empty body for key: ${key}`);
	const bytes = await response.Body.transformToByteArray();
	return Buffer.from(bytes);
}

/**
 * Delete a file from S3-compatible storage
 * @param key - Storage key
 */
export async function deleteFile(key: string): Promise<void> {
	const client = getS3Client();

	const command = new DeleteObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
	});

	await client.send(command);
	logger.info(`[s3] deleted ${key}`);
}

/**
 * Check if a file exists in S3-compatible storage
 * @param key - Storage key
 * @returns true if the file exists
 */
export async function fileExists(key: string): Promise<boolean> {
	const client = getS3Client();

	try {
		const command = new HeadObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		});
		await client.send(command);
		return true;
	} catch {
		return false;
	}
}

/**
 * Sanitize a filename for use as an S3 storage key segment.
 * Latinizes diacritics (ą→a, ö→o) then strips unsafe characters.
 */
export function sanitizeFileName(originalName: string): string {
	return filenamify(latinize(originalName), { replacement: "_" });
}

/**
 * Build a `Content-Disposition: attachment` value with a latinized, ASCII-safe
 * filename (e.g. ą → a). HTTP header values are ByteStrings, so raw
 * diacritics throw; reuse the same sanitization as the S3 storage keys.
 */
export function contentDispositionAttachment(originalName: string): string {
	return `attachment; filename="${sanitizeFileName(originalName)}"`;
}

/**
 * Build the display name for a submission file from its authors:
 *   single author → Imie_Nazwisko.ext
 *   multiple      → Imie_Nazwisko_et_al.ext  (first author by orderIndex)
 * Diacritics are latinized; each name word is capitalized; ext preserved.
 */
export function generateAuthorFileName(
	authors: { firstName: string; lastName: string }[],
	extension: string,
): string {
	const part = (s: string) =>
		sanitizeFileName(
			latinize(s)
				.trim()
				.toLowerCase()
				.replace(/(^|[\s-])([a-z])/g, (_, sep, c) => sep + c.toUpperCase()),
		).replace(/\s+/g, "_");

	const first = authors[0];
	const base = `${part(first.firstName)}_${part(first.lastName)}`;
	const suffix = authors.length > 1 ? "_et_al" : "";
	const ext = extension ? `.${extension.replace(/^\./, "")}` : "";
	return `${base}${suffix}${ext}`;
}

export function generateSubmissionFileKey(
	submissionId: string,
	versionNumber: number,
	originalName: string,
): string {
	const timestamp = Date.now();
	return `submissions/${submissionId}/v${versionNumber}/${timestamp}-${sanitizeFileName(originalName)}`;
}

export function generateExtractionFileKey(
	jobId: string,
	originalName: string,
): string {
	return `extraction-staging/${jobId}/${sanitizeFileName(originalName)}`;
}

export function generateReviewFileKey(
	reviewId: string,
	originalName: string,
): string {
	const timestamp = Date.now();
	return `reviews/${reviewId}/${timestamp}-${sanitizeFileName(originalName)}`;
}

export interface S3HealthResult {
	status: "healthy" | "error";
	endpoint: string;
	bucket: string;
	message: string;
}

export async function checkS3Health(): Promise<S3HealthResult> {
	const endpoint = S3_ENDPOINT ?? "";
	const bucket = S3_BUCKET ?? "";

	if (
		!S3_ENDPOINT ||
		!S3_ACCESS_KEY_ID ||
		!S3_SECRET_ACCESS_KEY ||
		!S3_BUCKET
	) {
		return {
			status: "error",
			endpoint,
			bucket,
			message: "Missing S3 environment variables",
		};
	}

	try {
		const client = getS3Client();
		await Promise.race([
			client.send(new HeadBucketCommand({ Bucket: bucket })),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error("S3 health check timed out")), 5000),
			),
		]);
		return {
			status: "healthy",
			endpoint,
			bucket,
			message: "S3 storage is reachable",
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown S3 error";
		logger.warn(`[s3] health check failed: ${message}`);
		return {
			status: "error",
			endpoint,
			bucket,
			message,
		};
	}
}
