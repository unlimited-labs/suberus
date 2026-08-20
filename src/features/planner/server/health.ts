import { env } from "@/env";
import { createHealthCache } from "@/shared/server/health-cache";

export interface PlannerHealthResult {
	status: "healthy" | "unavailable";
	message: string;
}

const healthCache = createHealthCache<PlannerHealthResult>(60_000);

export async function checkPlannerHealth(): Promise<PlannerHealthResult> {
	if (!env.PLANNER_API_URL) {
		return {
			status: "unavailable",
			message: "PLANNER_API_URL not configured",
		};
	}

	const cached = healthCache.get();
	if (cached) return cached;

	let result: PlannerHealthResult;
	try {
		const response = await fetch(env.PLANNER_API_URL, {
			signal: AbortSignal.timeout(5_000),
		});
		if (!response.ok) {
			result = {
				status: "unavailable",
				message: `Planner API returned ${response.status}`,
			};
		} else {
			// SAFETY: docx-api error bodies carry this shape; the catch supplies an empty object.
			const data = (await response.json().catch(() => ({}))) as {
				status?: string;
			};
			if (data.status === "healthy") {
				result = { status: "healthy", message: "Connected" };
			} else {
				result = {
					status: "unavailable",
					message: "Planner API did not report healthy status",
				};
			}
		}
	} catch {
		result = { status: "unavailable", message: "Cannot reach Planner API" };
	}

	healthCache.set(result);
	return result;
}
