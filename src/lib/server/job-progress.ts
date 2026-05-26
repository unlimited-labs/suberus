import { prisma } from "@/db.server.ts";
import type { Prisma } from "@/generated/prisma/client.js";

export async function createJobProgress(queue: string): Promise<string> {
	const job = await prisma.jobProgress.create({
		data: { queue },
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

export async function failJob(jobId: string, error: string): Promise<void> {
	await prisma.jobProgress.update({
		where: { id: jobId },
		data: { status: "error", error },
	});
}

export async function getJobProgress(jobId: string) {
	return prisma.jobProgress.findUnique({ where: { id: jobId } });
}
