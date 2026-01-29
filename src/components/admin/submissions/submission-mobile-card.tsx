import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { statusLabels, typeLabels } from "@/lib/labels/submission";
import type { AdminSubmission } from "@/lib/server/admin/submissions";

export function SubmissionMobileCard(submission: AdminSubmission) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="space-y-2">
					<p className="font-medium line-clamp-2">{submission.title}</p>
					<div className="flex items-center gap-2 flex-wrap">
						<Badge variant="outline">{typeLabels[submission.type]}</Badge>
						<Badge variant="secondary">{statusLabels[submission.status]}</Badge>
						<span className="text-xs text-muted-foreground">
							R{submission.currentRound}
						</span>
					</div>
					<p className="text-sm text-muted-foreground">
						{submission.ownerName}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
