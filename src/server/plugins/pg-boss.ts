import { definePlugin } from "nitro";
import { logger } from "@/logger";
import { getBoss } from "@/shared/server/queue";

// Boot start runs pending pg-boss schema migrations at deploy and brings workers up
// before any enqueue; on failure the first enqueue retries.
export default definePlugin(() => {
	getBoss().catch((err) =>
		logger.error(
			"[pg-boss] boot start failed, retrying on first enqueue:",
			err,
		),
	);
});
