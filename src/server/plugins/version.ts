import { definePlugin } from "nitro";
import { logger } from "@/logger";

export default definePlugin(() => {
	logger.info(
		`[build] commit=${process.env.GIT_COMMIT ?? "unknown"} builtAt=${process.env.BUILD_DATE ?? "unknown"}`,
	);
});
