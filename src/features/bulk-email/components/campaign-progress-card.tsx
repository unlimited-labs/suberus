import { useJobSSE } from "@/shared/hooks/use-job-sse";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Progress } from "@/shared/ui/progress";

interface CampaignProgressCardProps {
	campaign: {
		status: string;
		sentCount: number;
		failedCount: number;
		totalRecipients: number;
	};
	jobId: string | null;
}

function progressValue(job: {
	status: string | null;
	current: number;
	total: number;
}): number {
	if (job.status === "done") return 100;
	return job.total > 0 ? Math.round((job.current / job.total) * 100) : 0;
}

/** Live send progress (SSE). Renders nothing until the campaign leaves DRAFT. */
export function CampaignProgressCard({
	campaign,
	jobId,
}: CampaignProgressCardProps) {
	const job = useJobSSE(jobId);
	if (!jobId || campaign.status === "DRAFT") return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Sending progress</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2" data-testid="campaign-progress">
				<Progress value={progressValue(job)} />
				<p className="text-sm text-muted-foreground">
					{campaign.sentCount + campaign.failedCount} /{" "}
					{campaign.totalRecipients} processed
					{job.error ? (
						<span className="ml-2 text-destructive">{job.error}</span>
					) : null}
				</p>
			</CardContent>
		</Card>
	);
}
