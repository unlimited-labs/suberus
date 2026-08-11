import type { Prisma } from "@/generated/prisma/client.js";
import { prisma } from "@/shared/server/db.server.ts";

export async function createJobProgress(
	queue: string,
	createdById?: string,
): Promise<string> {
	const job = await prisma.jobProgress.create({
		data: { queue, createdById },
	});
	return job.id;
}

export async function setJobStage(
	jobId: string,
	stage: string,
	total: number,
): Promise<void> {
	await prisma.jobProgress.update({
		where: { id: jobId },
		data: { status: "running", stage, current: 0, total },
	});
}

export async function setJobCurrent(
	jobId: string,
	current: number,
): Promise<void> {
	await prisma.jobProgress.update({
		where: { id: jobId },
		data: { current },
	});
}

export async function completeJob(
	jobId: string,
	result?: Prisma.InputJsonValue,
): Promise<void> {
	await prisma.jobProgress.update({
		where: { id: jobId },
		data: { status: "done", stage: "done", current: 1, total: 1, result },
	});
}

/** `error` is streamed to the job owner over SSE — pass only client-safe text. */
export async function failJob(jobId: string, error: string): Promise<void> {
	await prisma.jobProgress.update({
		where: { id: jobId },
		data: { status: "error", error },
	});
}

export async function getJobProgress(jobId: string) {
	return prisma.jobProgress.findUnique({ where: { id: jobId } });
}
