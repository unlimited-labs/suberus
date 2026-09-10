import type { EmailCampaignStatus } from "@/generated/prisma/enums";

export const RESUMABLE_CAMPAIGN_STATUSES: EmailCampaignStatus[] = [
	"SCHEDULED",
	"QUEUED",
	"SENDING",
];

const JOB_BACKED_STATUSES: EmailCampaignStatus[] = [
	"QUEUED",
	"SENDING",
	"SENT",
	"FAILED",
];

export function hasLiveJob(status: EmailCampaignStatus): boolean {
	return JOB_BACKED_STATUSES.includes(status);
}

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
	const perRecipient = delaySeconds + 30;
	return Math.max(900, totalRecipients * perRecipient + 60);
}
