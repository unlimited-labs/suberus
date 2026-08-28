import AdmZip from "adm-zip";
import {
	cameraReadyNumberFromFilename,
	isIgnoredBulkEntry,
} from "@/features/submissions/server/camera-ready-match";
import { prisma } from "@/shared/server/db.server";
import {
	contentDisposition,
	sanitizeFileName,
} from "@/shared/server/file-names";
import {
	deleteFile,
	getFileContent,
	uploadFile,
} from "@/shared/server/storage";
import {
	UploadValidationError,
	validateUpload,
} from "@/shared/server/validate-upload";

export const MAX_CAMERA_READY_BYTES = 25 * 1024 * 1024;

export type CameraReadyFailReason = "not-found" | "not-pdf" | "too-large";

export type SetCameraReadyResult =
	| { ok: true }
	| { ok: false; reason: CameraReadyFailReason; error: string };

export async function setCameraReady(
	submissionId: string,
	buffer: Buffer,
	originalName: string,
	uploadedById: string,
): Promise<SetCameraReadyResult> {
	try {
		await validateUpload(buffer, {
			allowedExtensions: ["pdf"],
			maxBytes: MAX_CAMERA_READY_BYTES,
		});
	} catch (error) {
		if (error instanceof UploadValidationError) {
			const reason = /limit/.test(error.message) ? "too-large" : "not-pdf";
			return { ok: false, reason, error: error.message };
		}
		throw error;
	}

	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: { cameraReadyFileId: true },
	});
	if (!submission) {
		return { ok: false, reason: "not-found", error: "Submission not found" };
	}

	const storageKey = `camera-ready/${submissionId}.pdf`;
	await uploadFile(buffer, storageKey, "application/pdf");

	const fileData = {
		entityType: "SUBMISSION" as const,
		entityId: submissionId,
		type: "CAMERA_READY" as const,
		storageKey,
		fileName: sanitizeFileName(originalName),
		originalName,
		mimeType: "application/pdf",
		size: buffer.length,
		uploadedById,
	};

	if (submission.cameraReadyFileId) {
		await prisma.file.update({
			where: { id: submission.cameraReadyFileId },
			data: fileData,
		});
	} else {
		const file = await prisma.file.create({ data: fileData });
		await prisma.submission.update({
			where: { id: submissionId },
			data: { cameraReadyFileId: file.id },
		});
	}
	return { ok: true };
}

export async function getCameraReady(
	submissionId: string,
): Promise<{ id: string; originalName: string; size: number } | null> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: {
			cameraReadyFile: { select: { id: true, originalName: true, size: true } },
		},
	});
	return submission?.cameraReadyFile ?? null;
}

export async function clearCameraReady(submissionId: string): Promise<void> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: { cameraReadyFile: { select: { id: true, storageKey: true } } },
	});
	const file = submission?.cameraReadyFile;
	if (!file) return;

	await prisma.submission.update({
		where: { id: submissionId },
		data: { cameraReadyFileId: null },
	});
	await prisma.file.delete({ where: { id: file.id } });
	await deleteFile(file.storageKey).catch(() => {});
}

export interface BulkSkip {
	name: string;
	reason: CameraReadyFailReason | "no-number";
}
export interface BulkCameraReadyResult {
	uploaded: number;
	skipped: BulkSkip[];
}

export async function uploadCameraReadyBulkZip(
	zipBuffer: Buffer,
	uploadedById: string,
): Promise<BulkCameraReadyResult> {
	const entries = new AdmZip(zipBuffer).getEntries();
	let uploaded = 0;
	const skipped: BulkSkip[] = [];

	for (const entry of entries) {
		if (entry.isDirectory) continue;
		const base = entry.entryName.split("/").pop() ?? entry.entryName;
		if (isIgnoredBulkEntry(base)) continue;

		const seq = cameraReadyNumberFromFilename(base);
		if (seq === null) {
			skipped.push({ name: base, reason: "no-number" });
			continue;
		}
		const submission = await prisma.submission.findUnique({
			where: { sequentialNumber: seq },
			select: { id: true },
		});
		if (!submission) {
			skipped.push({ name: base, reason: "not-found" });
			continue;
		}
		const result = await setCameraReady(
			submission.id,
			entry.getData(),
			base,
			uploadedById,
		);
		if (result.ok) uploaded++;
		else skipped.push({ name: base, reason: result.reason });
	}

	return { uploaded, skipped };
}

export async function cameraReadyFileResponse(
	file: { storageKey: string; originalName: string } | null | undefined,
): Promise<Response> {
	if (!file) return new Response("Not found", { status: 404 });

	const result = await getFileContent(file.storageKey);
	return new Response(result.body, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": contentDisposition("inline", file.originalName),
			...(result.contentLength && {
				"Content-Length": String(result.contentLength),
			}),
		},
	});
}
