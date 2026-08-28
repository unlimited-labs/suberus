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
import { sanitizeFileName } from "./file-names";

// S3-compatible object storage env (GARAGE_* honored as deprecated aliases)
const S3_ENDPOINT = env.S3_ENDPOINT ?? env.GARAGE_ENDPOINT;
const S3_ACCESS_KEY_ID = env.S3_ACCESS_KEY_ID ?? env.GARAGE_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY =
	env.S3_SECRET_ACCESS_KEY ?? env.GARAGE_SECRET_ACCESS_KEY;
const S3_BUCKET = env.S3_BUCKET ?? env.GARAGE_BUCKET;

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

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
	if (!_s3Client) {
		validateEnv();
		// SAFETY: validateEnv() above throws when either credential is missing.
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

export async function deleteFile(key: string): Promise<void> {
	const client = getS3Client();

	const command = new DeleteObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
	});

	await client.send(command);
	logger.info(`[s3] deleted ${key}`);
}

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

export function generateCampaignAttachmentKey(
	campaignId: string,
	originalName: string,
): string {
	const timestamp = Date.now();
	return `campaigns/${campaignId}/${timestamp}-${sanitizeFileName(originalName)}`;
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
