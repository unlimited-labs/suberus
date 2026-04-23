import { defineTask } from "nitro/task";
import { logger } from "@/logger";

export default defineTask({
	meta: {
		name: "services:health",
		description: "Check health of external services (LLM, Docling, Planner)",
	},
	async run() {
		logger.info("[task:services:health] started");

		const { checkLlmHealth } = await import("@/lib/server/llm");
		const { checkDoclingHealth } = await import("@/lib/server/docling");
		const { checkPlannerHealth } = await import(
			"@/lib/server/planner/health"
		);
		const { setSetting } = await import("@/lib/server/settings");

		const [llm, docling, planner] = await Promise.all([
			checkLlmHealth(),
			checkDoclingHealth(),
			checkPlannerHealth(),
		]);

		const checkedAt = new Date().toISOString();

		await Promise.all([
			setSetting("SERVICE_HEALTH_LLM", {
				status: llm.status,
				message: llm.message,
				gpu: llm.gpu,
				models: llm.models,
				checkedAt,
			}),
			setSetting("SERVICE_HEALTH_DOCLING", {
				status: docling.status,
				message: docling.message,
				checkedAt,
			}),
			setSetting("SERVICE_HEALTH_PLANNER", {
				status: planner.status,
				message: planner.message,
				checkedAt,
			}),
		]);

		logger.info(
			`[task:services:health] done — llm=${llm.status} docling=${docling.status} planner=${planner.status}`,
		);
		return {
			result: {
				llm: llm.status,
				docling: docling.status,
				planner: planner.status,
			},
		};
	},
});
