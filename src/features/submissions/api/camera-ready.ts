import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/features/auth/server/middleware";
import {
	type BulkCameraReadyResult,
	clearCameraReady,
	getCameraReady,
	setCameraReady,
	uploadCameraReadyBulkZip,
} from "@/features/submissions/server/camera-ready";
import { fileToBuffer, getUploadedFile } from "@/shared/server/form-upload";

export const uploadCameraReadyFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator((data: FormData) =>
		z.object({ submissionId: z.uuid(), file: z.instanceof(File) }).parse({
			submissionId: data.get("submissionId"),
			file: getUploadedFile(data),
		}),
	)
	.handler(async ({ data, context }) => {
		const result = await setCameraReady(
			data.submissionId,
			await fileToBuffer(data.file),
			data.file.name,
			context.user.id,
		);
		return result.ok
			? { success: true as const }
			: { success: false as const, error: result.error };
	});

export const getCameraReadyFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(z.object({ submissionId: z.uuid() }))
	.handler(({ data }) => getCameraReady(data.submissionId));

export const cameraReadyQueryOptions = (submissionId: string) =>
	queryOptions({
		queryKey: ["camera-ready", submissionId],
		queryFn: () => getCameraReadyFn({ data: { submissionId } }),
	});

export const deleteCameraReadyFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ submissionId: z.uuid() }))
	.handler(async ({ data }) => {
		await clearCameraReady(data.submissionId);
		return { success: true as const };
	});

export const uploadCameraReadyBulkFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator((data: FormData) =>
		z
			.object({ file: z.instanceof(File) })
			.parse({ file: getUploadedFile(data) }),
	)
	.handler(async ({ data, context }): Promise<BulkCameraReadyResult> => {
		return uploadCameraReadyBulkZip(
			await fileToBuffer(data.file),
			context.user.id,
		);
	});
