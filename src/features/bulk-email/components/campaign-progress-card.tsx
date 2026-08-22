import { IconProgressCheck } from "@tabler/icons-react";
import type { JobSSEState } from "@/shared/hooks/use-job-sse";
import { Progress } from "@/shared/ui/progress";
import { SectionCard } from "@/shared/ui/section-card";

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

export function CampaignProgressCard({
	campaign,
	jobId,
	job,
}: CampaignProgressCardProps) {
	if (!jobId || campaign.status === "DRAFT") return null;

	const useLive = job.status === "running" && job.total > 0;
	const processed = useLive
		? job.current
		: campaign.sentCount + campaign.failedCount;
	const total = useLive ? job.total : campaign.totalRecipients;

	return (
		<SectionCard
			icon={IconProgressCheck}
			title="Sending progress"
			variant="elevated"
		>
			<div className="space-y-2" data-testid="campaign-progress">
				<Progress value={progressValue(job)} />
				<p className="text-muted-foreground text-sm">
					{processed} / {total} processed
					{job.error ? (
						<span className="text-destructive ml-2">{job.error}</span>
					) : null}
				</p>
			</div>
		</SectionCard>
	);
}
