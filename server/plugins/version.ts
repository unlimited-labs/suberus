import { definePlugin } from "nitro";
import { logger } from "@/logger";

// Logs the build metadata once at server startup so the running version is
// visible in `docker logs`. Values are injected via Docker ARG/ENV at build time.
export default definePlugin(() => {
	logger.info(
		`[build] commit=${process.env.GIT_COMMIT ?? "unknown"} builtAt=${process.env.BUILD_DATE ?? "unknown"}`,
	);
});
