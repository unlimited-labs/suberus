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
					<p className="text-xs text-muted-foreground">
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
