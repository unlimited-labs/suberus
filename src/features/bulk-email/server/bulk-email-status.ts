import type { EmailCampaignStatus } from "@/generated/prisma/enums";

/**
 * Statuses from which the worker may (re)process a campaign. Restricting to
 * these makes the job idempotent: a DRAFT is not ready and an already-SENT
 * campaign is never re-sent on a pg-boss retry.
 */
export function isResumableCampaignStatus(
	status: EmailCampaignStatus,
): boolean {
	return status === "QUEUED" || status === "SENDING";
}

/** A campaign is FAILED only when every attempt failed; otherwise SENT. */
export function finalCampaignStatus(
	sentCount: number,
	failedCount: number,
): EmailCampaignStatus {
	return sentCount === 0 && failedCount > 0 ? "FAILED" : "SENT";
}

/**
 * pg-boss job expiry for a campaign. MUST exceed the worst-case run time
 * (total × delay, plus SMTP latency per recipient) or the job expires
 * mid-send and a retry resumes it; we add generous headroom and a floor so
 * small campaigns still get a sane timeout.
 */
export function campaignExpireSeconds(
	totalRecipients: number,
	delaySeconds: number,
): number {
	const perRecipient = delaySeconds + 30; // delay + SMTP headroom
	return Math.max(900, totalRecipients * perRecipient + 60);
}
