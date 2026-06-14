import { IconClock } from "@tabler/icons-react";
import {
	assignmentStatusLabels,
	assignmentStatusVariants,
} from "@/features/reviews/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

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
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-base">
					<span>
						Reviewers ({completedCount}/{currentRoundAssignments.length})
					</span>
					<span className="text-sm font-normal text-muted-foreground">
						Required: {requiredReviewers}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{currentRoundAssignments.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No reviewers assigned yet
					</p>
				) : (
					<>
						<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all"
								style={{ width: `${reviewProgress}%` }}
							/>
						</div>
						<div className="space-y-2">
							{currentRoundAssignments.map((assignment) => {
								const overdue = isOverdue(
									assignment.deadline,
									assignment.status,
								);
								return (
									<div
										key={assignment.id}
										className="flex items-start justify-between gap-2 rounded-lg border p-3"
									>
										<div className="min-w-0">
											<div className="truncate text-sm font-medium">
												{assignment.reviewerName}
											</div>
											<div className="truncate text-xs text-muted-foreground">
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
													assignment.status as keyof typeof assignmentStatusVariants
												] ?? "outline"
											}
										>
											{assignmentStatusLabels[
												assignment.status as keyof typeof assignmentStatusLabels
											] ?? assignment.status}
										</Badge>
									</div>
								);
							})}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
