import { Link } from "@tanstack/react-router";
import {
	statusLabels,
	todoBadgeVariant,
	todoLabel,
	todoTone,
	typeLabels,
} from "@/features/submissions/labels";
import type { AdminSubmission } from "@/features/submissions/server/admin-submissions";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

export function SubmissionMobileCard(submission: AdminSubmission) {
	const { formatDate } = useDateFormat();
	return (
		<Card>
			<CardContent className="p-4">
				<div className="space-y-2">
					<div className="flex items-start gap-2">
						<span className="text-muted-foreground mt-0.5 shrink-0 font-mono text-xs">
							#{submission.sequentialNumber}
						</span>
						<Link
							className="line-clamp-2 font-medium hover:underline"
							params={{ id: submission.id }}
							to="/admin/submissions/$id"
						>
							{submission.title}
						</Link>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline">{typeLabels[submission.type]}</Badge>
						<Badge variant="secondary">{statusLabels[submission.status]}</Badge>
						<span className="text-muted-foreground text-xs">
							R{submission.currentRound}
						</span>
					</div>
					<p className="text-muted-foreground text-sm">
						{submission.ownerName}
					</p>
					<p className="text-muted-foreground text-xs">
						Submitted {formatDate(submission.createdAt)}
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
