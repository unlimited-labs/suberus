import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";
import { logger } from "@/logger.ts";

// Environment variables for Garage S3
const GARAGE_ENDPOINT = env.GARAGE_ENDPOINT;
const GARAGE_ACCESS_KEY_ID = env.GARAGE_ACCESS_KEY_ID;
const GARAGE_SECRET_ACCESS_KEY = env.GARAGE_SECRET_ACCESS_KEY;
const GARAGE_BUCKET = env.GARAGE_BUCKET;

// Validate required environment variables
function validateEnv(): void {
	if (!GARAGE_ENDPOINT) {
		throw new Error("GARAGE_ENDPOINT environment variable is required");
	}
	if (!GARAGE_ACCESS_KEY_ID) {
		throw new Error("GARAGE_ACCESS_KEY_ID environment variable is required");
	}
	if (!GARAGE_SECRET_ACCESS_KEY) {
		throw new Error(
			"GARAGE_SECRET_ACCESS_KEY environment variable is required",
		);
	}
	if (!GARAGE_BUCKET) {
		throw new Error("GARAGE_BUCKET environment variable is required");
	}
}

// Lazy initialization of S3 client
let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
	if (!_s3Client) {
		validateEnv();
		_s3Client = new S3Client({
			endpoint: GARAGE_ENDPOINT,
			region: "garage", // Garage uses "garage" as region
			credentials: {
				accessKeyId: GARAGE_ACCESS_KEY_ID as string,
				secretAccessKey: GARAGE_SECRET_ACCESS_KEY as string,
			},
			forcePathStyle: true, // Required for Garage/MinIO
		});
	}
	return _s3Client;
}

/**
 * Upload a file to Garage S3
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
		Bucket: GARAGE_BUCKET,
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
		Bucket: GARAGE_BUCKET,
		Key: key,
	});

	return getSignedUrl(client, command, { expiresIn });
}

/**
 * Get file content from S3 as a readable stream
 * @param key - Storage key
 * @returns File body stream with metadata
 */
export async function getFileContent(key: string): Promise<{
	body: ReadableStream;
	contentType: string;
	contentLength: number;
}> {
	const client = getS3Client();

	const command = new GetObjectCommand({
		Bucket: GARAGE_BUCKET,
		Key: key,
	});

	const response = await client.send(command);

	return {
		body: response.Body as ReadableStream,
		contentType: response.ContentType ?? "application/octet-stream",
		contentLength: response.ContentLength ?? 0,
	};
}

/**
 * Delete a file from Garage S3
 * @param key - Storage key
 */
export async function deleteFile(key: string): Promise<void> {
	const client = getS3Client();

	const command = new DeleteObjectCommand({
		Bucket: GARAGE_BUCKET,
		Key: key,
	});

	await client.send(command);
	logger.info(`[s3] deleted ${key}`);
}

/**
 * Check if a file exists in Garage S3
 * @param key - Storage key
 * @returns true if the file exists
 */
export async function fileExists(key: string): Promise<boolean> {
	const client = getS3Client();

	try {
		const command = new HeadObjectCommand({
			Bucket: GARAGE_BUCKET,
			Key: key,
		});
		await client.send(command);
		return true;
	} catch {
		return false;
	}
}

/**
 * Generate a unique storage key for a submission file
 * @param submissionId - Submission ID
 * @param versionNumber - Version number
 * @param originalName - Original file name
 * @returns Storage key
 */
export function generateSubmissionFileKey(
	submissionId: string,
	versionNumber: number,
	originalName: string,
): string {
	const timestamp = Date.now();
	const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
	return `submissions/${submissionId}/v${versionNumber}/${timestamp}-${sanitizedName}`;
}

export interface S3HealthResult {
	status: "healthy" | "error";
	endpoint: string;
	bucket: string;
	message: string;
}

export async function checkS3Health(): Promise<S3HealthResult> {
	const endpoint = GARAGE_ENDPOINT ?? "";
	const bucket = GARAGE_BUCKET ?? "";

	if (
		!GARAGE_ENDPOINT ||
		!GARAGE_ACCESS_KEY_ID ||
		!GARAGE_SECRET_ACCESS_KEY ||
		!GARAGE_BUCKET
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
		await client.send(new HeadBucketCommand({ Bucket: bucket }));
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
