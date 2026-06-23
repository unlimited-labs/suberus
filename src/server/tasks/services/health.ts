import { defineTask } from "nitro/task";
import { checkPdfApiHealth } from "@/features/extraction/server/pdf-api";
import { checkPlannerHealth } from "@/features/planner/server/health";
import { setSetting } from "@/features/settings/server/settings";
import { logger } from "@/logger";
import { checkLlmHealth } from "@/shared/server/llm";

export default defineTask({
	meta: {
		name: "services:health",
		description: "Check health of external services (LLM, PDF API, Planner)",
	},
	async run() {
		logger.info("[task:services:health] started");

		const [llm, pdfApi, planner] = await Promise.all([
			checkLlmHealth(),
			checkPdfApiHealth(),
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
			setSetting("SERVICE_HEALTH_PDF_API", {
				status: pdfApi.status,
				message: pdfApi.message,
				checkedAt,
			}),
			setSetting("SERVICE_HEALTH_PLANNER", {
				status: planner.status,
				message: planner.message,
				checkedAt,
			}),
		]);

		logger.info(
			`[task:services:health] done — llm=${llm.status} pdf-api=${pdfApi.status} planner=${planner.status}`,
		);
		return {
			result: {
				llm: llm.status,
				pdfApi: pdfApi.status,
				planner: planner.status,
			},
		};
	},
});
