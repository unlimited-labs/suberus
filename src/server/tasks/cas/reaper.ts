import { defineTask } from "nitro/task";
import { reapCasObjects } from "@/features/submission-diff/server/reaper";
import { logger } from "@/logger";

export default defineTask({
	meta: {
		name: "cas:reaper",
		description: "Mark-and-sweep GC for version-diff CAS objects",
	},
	async run() {
		logger.info("[task:cas:reaper] started");
		const result = await reapCasObjects();
		logger.info(
			`[task:cas:reaper] done — supersededArtifacts=${result.supersededArtifacts} danglingDiffs=${result.danglingDiffs} sweptObjects=${result.sweptObjects}`,
		);
		return { result };
	},
});
