import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { applyAutoPlan } from "@/features/planner/server/autoplan";
import {
	getAutoPlanJob,
	startAutoPlan,
} from "@/features/planner/server/autoplan-job";
import { jobIdInput } from "@/features/planner/validations";

export const startAutoPlanFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.handler(async ({ context }) => {
		return startAutoPlan(context.user.id);
	});

export const getAutoPlanJobFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(jobIdInput)
	.handler(async ({ data }) => {
		return getAutoPlanJob(data.jobId);
	});

export const applyAutoPlanFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(jobIdInput)
	.handler(async ({ data }) => {
		return applyAutoPlan(data.jobId);
	});
