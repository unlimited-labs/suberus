import {
	type LogActivityParams,
	logActivity,
} from "@/features/activity-log/server/activity-log";
import { logger } from "@/logger.ts";

/**
 * The CIMD hooks are best-effort: a rejected callback is logged but does not
 * roll back an otherwise valid registration. Swallowing here keeps that
 * contract explicit instead of relying on the plugin's own catch.
 */
export async function recordMcpClientActivity(
	params: LogActivityParams,
): Promise<void> {
	try {
		await logActivity(params);
	} catch (error) {
		logger.error("[mcp] failed to record CIMD audit entry:", error);
	}
}
