import { defineTask } from "nitro/task";
import { logger } from "@/logger";

export default defineTask({
	meta: {
		name: "services:health",
		description: "Check health of external services (LLM, Docling)",
	},
	async run() {
		logger.info("[task:services:health] started");

		const { checkLlmHealth } = await import("@/lib/server/llm");
		const { checkDoclingHealth } = await import("@/lib/server/docling");
		const { setSetting } = await import("@/utils/settings.server");

		const [llm, docling] = await Promise.all([
			checkLlmHealth(),
			checkDoclingHealth(),
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
		]);

		logger.info(
			`[task:services:health] done — llm=${llm.status} docling=${docling.status}`,
		);
		return { result: { llm: llm.status, docling: docling.status } };
	},
});
