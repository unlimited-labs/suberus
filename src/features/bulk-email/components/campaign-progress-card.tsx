import { IconProgressCheck } from "@tabler/icons-react";
import type { JobSSEState } from "@/shared/hooks/use-job-sse";
import { Panel } from "@/shared/ui/panel";
import { Progress } from "@/shared/ui/progress";

interface CampaignProgressCardProps {
	campaign: {
		status: string;
		sentCount: number;
		failedCount: number;
		totalRecipients: number;
	};
	jobId: string | null;
	job: JobSSEState;
}

function progressValue(job: JobSSEState): number {
	if (job.status === "done") return 100;
	return job.total > 0 ? Math.round((job.current / job.total) * 100) : 0;
}

/** Live send progress (SSE). Renders nothing until the campaign leaves DRAFT. */
export function CampaignProgressCard({
	campaign,
	jobId,
	job,
}: CampaignProgressCardProps) {
	if (!jobId || campaign.status === "DRAFT") return null;

	// While running, the SSE counters track per-recipient progress live. On
	// completion the shared job row is normalised to 1/1, so fall back to the
	// persisted campaign counts (refreshed by the done-triggered refetch).
	const useLive = job.status === "running" && job.total > 0;
	const processed = useLive
		? job.current
		: campaign.sentCount + campaign.failedCount;
	const total = useLive ? job.total : campaign.totalRecipients;

	return (
		<Panel title="Sending progress" icon={IconProgressCheck}>
			<div className="space-y-2" data-testid="campaign-progress">
				<Progress value={progressValue(job)} />
				<p className="text-sm text-muted-foreground">
					{processed} / {total} processed
					{job.error ? (
						<span className="ml-2 text-destructive">{job.error}</span>
					) : null}
				</p>
			</div>
		</Panel>
	);
}
