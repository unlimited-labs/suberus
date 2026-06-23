import { defineTask } from "nitro/task";
import { checkPdfApiHealth } from "@/features/extraction/server/pdf-api";
import { checkPlannerHealth } from "@/features/planner/server/health";
import { setSetting } from "@/features/settings/server/settings";
import { checkDocxApiHealth } from "@/features/submission-diff/server/docx-api-client";
import { logger } from "@/logger";
import { checkLlmHealth } from "@/shared/server/llm";

export default defineTask({
	meta: {
		name: "services:health",
		description:
			"Check health of external services (LLM, PDF API, docx-api, Planner)",
	},
	async run() {
		logger.verbose("[task:services:health] started");

		const [llm, pdfApi, docxApi, planner] = await Promise.all([
			checkLlmHealth(),
			checkPdfApiHealth(),
			checkDocxApiHealth(),
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
			setSetting("SERVICE_HEALTH_DOCX_API", {
				status: docxApi.status,
				message: docxApi.message,
				checkedAt,
			}),
			setSetting("SERVICE_HEALTH_PLANNER", {
				status: planner.status,
				message: planner.message,
				checkedAt,
			}),
		]);

		logger.verbose(
			`[task:services:health] done — llm=${llm.status} pdf-api=${pdfApi.status} docx-api=${docxApi.status} planner=${planner.status}`,
		);
		return {
			result: {
				llm: llm.status,
				pdfApi: pdfApi.status,
				docxApi: docxApi.status,
				planner: planner.status,
			},
		};
	},
});
