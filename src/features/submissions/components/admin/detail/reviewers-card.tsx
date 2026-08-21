import { IconClock } from "@tabler/icons-react";
import {
	assignmentStatusLabels,
	assignmentStatusVariants,
} from "@/features/reviews/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { SectionCard } from "@/shared/ui/section-card";
import { type EditorAssignment, isOverdue } from "./availability";

interface ReviewersCardProps {
	currentRoundAssignments: EditorAssignment[];
	completedCount: number;
	requiredReviewers: number;
	reviewProgress: number;
}

export function ReviewersCard({
	currentRoundAssignments,
	completedCount,
	requiredReviewers,
	reviewProgress,
}: ReviewersCardProps) {
	const { formatDate } = useDateFormat();

	return (
		<SectionCard
			action={
				<span className="text-muted-foreground text-sm font-normal">
					Required: {requiredReviewers}
				</span>
			}
			contentClassName="space-y-3"
			title={`Reviewers (${completedCount}/${currentRoundAssignments.length})`}
		>
			{currentRoundAssignments.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No reviewers assigned yet
				</p>
			) : (
				<>
					<div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
						<div
							className="bg-primary h-full rounded-full transition-[width]"
							style={{ width: `${reviewProgress}%` }}
						/>
					</div>
					<div className="space-y-2">
						{currentRoundAssignments.map((assignment) => {
							const overdue = isOverdue(assignment.deadline, assignment.status);
							return (
								<div
									className="flex items-start justify-between gap-2 rounded-lg border p-3"
									key={assignment.id}
								>
									<div className="min-w-0">
										<div className="truncate text-sm font-medium">
											{assignment.reviewerName}
										</div>
										<div className="text-muted-foreground truncate text-xs">
											{assignment.reviewerEmail}
										</div>
										{assignment.deadline &&
											assignment.status !== "COMPLETED" && (
												<div
													className={cn(
														"mt-1 flex items-center gap-1 text-xs",
														overdue
															? "text-destructive"
															: "text-muted-foreground",
													)}
												>
													<IconClock className="size-3" />
													{overdue ? "Overdue" : "Due"}{" "}
													{formatDate(assignment.deadline)}
												</div>
											)}
									</div>
									<Badge
										variant={
											assignmentStatusVariants[
												// SAFETY: the table is keyed by this enum; the fallback covers an unrecognised key.
												assignment.status as keyof typeof assignmentStatusVariants
											] ?? "outline"
										}
									>
										{assignmentStatusLabels[
											// SAFETY: the table is keyed by this enum; the fallback covers an unrecognised key.
											assignment.status as keyof typeof assignmentStatusLabels
										] ?? assignment.status}
									</Badge>
								</div>
							);
						})}
					</div>
				</>
			)}
		</SectionCard>
	);
}
