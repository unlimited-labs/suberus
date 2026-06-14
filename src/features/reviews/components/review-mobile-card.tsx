import {
	IconAlertTriangle,
	IconCircleCheck,
	IconClock,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { differenceInCalendarDays } from "date-fns";
import type { ReviewerAssignment } from "@/features/reviews/api/assignments";
import {
	assignmentStatusLabels,
	assignmentStatusVariants,
} from "@/features/reviews/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { typeLabels } from "@/shared/lib/labels/submission";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

export function ReviewMobileCard(assignment: ReviewerAssignment) {
	const { formatDate } = useDateFormat();
	const deadline = assignment.deadline;
	const daysRemaining = deadline
		? differenceInCalendarDays(deadline, new Date())
		: null;
	const isPast = daysRemaining !== null && daysRemaining < 0;
	const isUrgent =
		daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0;
	const isAnonymous = assignment.authorName === "Anonymous Author";

	const dateStr = deadline ? formatDate(deadline) : undefined;

	return (
		<Card className="overflow-hidden">
			<CardContent className="p-4">
				<div className="space-y-3">
					{/* Title */}
					<div>
						<p className="font-medium line-clamp-2">
							{assignment.submissionTitle}
						</p>
					</div>

					{/* Badges */}
					<div className="flex items-center gap-2 flex-wrap">
						<Badge variant="outline" className="text-xs">
							{typeLabels[assignment.submissionType]}
						</Badge>
						<Badge
							variant={
								assignmentStatusVariants[
									assignment.status as keyof typeof assignmentStatusVariants
								] ?? "secondary"
							}
						>
							{assignmentStatusLabels[
								assignment.status as keyof typeof assignmentStatusLabels
							] ?? assignment.status}
						</Badge>
						{assignment.round > 1 && (
							<span className="text-xs text-muted-foreground">
								R{assignment.round}
							</span>
						)}
					</div>

					{/* Author */}
					{!isAnonymous ? (
						<div className="text-sm">
							<p className="font-medium text-foreground">
								{assignment.authorName}
							</p>
							<p className="text-xs text-muted-foreground">
								{assignment.authorAffiliation}
							</p>
						</div>
					) : (
						<p className="text-sm italic text-muted-foreground">
							Double-blind review
						</p>
					)}

					{/* Deadline */}
					{deadline && (
						<div className="flex items-center gap-2 pt-2 border-t border-border">
							{assignment.status === "COMPLETED" ? (
								<>
									<IconCircleCheck className="size-4 text-primary" />
									<span className="text-sm text-muted-foreground">
										Completed on {dateStr}
									</span>
								</>
							) : isPast || assignment.status === "OVERDUE" ? (
								<>
									<IconAlertTriangle className="size-4 text-destructive" />
									<span className="text-sm font-semibold text-destructive">
										{daysRemaining !== null ? Math.abs(daysRemaining) : 0}d
										overdue ({dateStr})
									</span>
								</>
							) : isUrgent ? (
								<>
									<IconClock className="size-4 text-destructive animate-pulse" />
									<span className="text-sm font-semibold text-destructive">
										{daysRemaining}d left ({dateStr})
									</span>
								</>
							) : (
								<>
									<IconClock className="size-4 text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										{daysRemaining}d left ({dateStr})
									</span>
								</>
							)}
						</div>
					)}

					{/* Action */}
					{assignment.status !== "CANCELLED" && (
						<Button
							asChild
							variant={
								assignment.status === "COMPLETED" ? "outline" : "default"
							}
							className="w-full"
							size="sm"
						>
							{assignment.status === "COMPLETED" ? (
								<Link
									to="/reviews/$assignmentId"
									params={{ assignmentId: assignment.id }}
								>
									View Review
								</Link>
							) : (
								<Link
									to="/reviews/$assignmentId"
									params={{ assignmentId: assignment.id }}
								>
									Submit Review
								</Link>
							)}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
