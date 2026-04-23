import crypto from "node:crypto";
import { logger } from "@/logger.ts";
import type { AutoPlanProposal } from "./autoplan-types";

export type AutoPlanStatus = "pending" | "running" | "done" | "error";

export interface AutoPlanProgress {
	stage: string;
	current: number;
	total: number;
}

export interface AutoPlanJob {
	id: string;
	status: AutoPlanStatus;
	progress: AutoPlanProgress;
	proposal?: AutoPlanProposal;
	error?: string;
	appliedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const JOB_TTL_MS = 30 * 60_000;

const jobs = new Map<string, AutoPlanJob>();

function prune(): void {
	const now = Date.now();
	for (const [id, j] of jobs) {
		if (now - j.updatedAt.getTime() > JOB_TTL_MS) jobs.delete(id);
	}
}

export function createJob(): AutoPlanJob {
	prune();
	const id = crypto.randomUUID();
	const now = new Date();
	const job: AutoPlanJob = {
		id,
		status: "pending",
		progress: { stage: "queued", current: 0, total: 0 },
		createdAt: now,
		updatedAt: now,
	};
	jobs.set(id, job);
	return job;
}

export function getJob(id: string): AutoPlanJob | undefined {
	return jobs.get(id);
}

export function updateJob(
	id: string,
	patch: Partial<Omit<AutoPlanJob, "id" | "createdAt">>,
): void {
	const j = jobs.get(id);
	if (!j) {
		logger.warn(`[autoplan-queue] update on unknown job ${id}`);
		return;
	}
	Object.assign(j, patch, { updatedAt: new Date() });
}

export function setStage(id: string, stage: string, total: number): void {
	updateJob(id, {
		status: "running",
		progress: { stage, current: 0, total },
	});
}

export function setProgress(id: string, current: number): void {
	const j = jobs.get(id);
	if (!j) return;
	updateJob(id, {
		progress: { ...j.progress, current },
	});
}
