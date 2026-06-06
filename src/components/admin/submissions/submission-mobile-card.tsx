import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	statusLabels,
	todoBadgeVariant,
	todoLabel,
	todoTone,
	typeLabels,
} from "@/lib/labels/submission";
import type { AdminSubmission } from "@/lib/server/admin/submissions";

export function SubmissionMobileCard(submission: AdminSubmission) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="space-y-2">
					<div className="flex items-start gap-2">
						<span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
							#{submission.sequentialNumber}
						</span>
						<Link
							to="/admin/submissions/$id"
							params={{ id: submission.id }}
							className="font-medium line-clamp-2 hover:underline"
						>
							{submission.title}
						</Link>
					</div>
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
					{todoTone(submission.todo.kind) === "action" && (
						<Badge variant={todoBadgeVariant[submission.todo.kind]}>
							{todoLabel(submission.todo)}
						</Badge>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
