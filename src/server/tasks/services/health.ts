import { defineTask } from "nitro/task";
import { checkDoclingHealth } from "@/features/extraction/server/docling";
import { checkPlannerHealth } from "@/features/planner/server/health";
import { setSetting } from "@/features/settings/server/settings";
import { logger } from "@/logger";
import { checkLlmHealth } from "@/shared/server/llm";

export default defineTask({
	meta: {
		name: "services:health",
		description: "Check health of external services (LLM, Docling, Planner)",
	},
	async run() {
		logger.info("[task:services:health] started");

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
				model: llm.model,
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
