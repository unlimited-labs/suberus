import { IconDownload } from "@tabler/icons-react";
import { reviewDecisionColors } from "@/features/submissions/labels";
import { lookup } from "@/shared/lib/lookup";
import { formatFileSize } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { SectionCard } from "@/shared/ui/section-card";
import type { EditorReview } from "./availability";

interface ReviewCardProps {
	review: EditorReview;
	showRound: boolean;
	enableScoring: boolean;
	enableConfidenceLevel: boolean;
}

export function ReviewCard({
	review,
	showRound,
	enableScoring,
	enableConfidenceLevel,
}: ReviewCardProps) {
	return (
		<SectionCard
			title={review.reviewerName}
			description={
				showRound ? (
					<span className="text-xs">Round {review.round}</span>
				) : undefined
			}
			action={
				<Badge
					variant="outline"
					className={lookup(reviewDecisionColors, review.decision)}
				>
					{review.decision.replace(/_/g, " ")}
				</Badge>
			}
			contentClassName="space-y-4"
		>
			{enableScoring &&
				review.scores &&
				Object.keys(review.scores).length > 0 && (
					<div>
						<p className="mb-2 text-sm font-medium">Scores</p>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{Object.entries(review.scores).map(([name, score]) => (
								<div
									key={name}
									className="flex justify-between rounded bg-muted/50 px-2 py-1 text-sm"
								>
									<span className="mr-2 truncate text-muted-foreground">
										{name}
									</span>
									<span className="font-medium">{score}/5</span>
								</div>
							))}
						</div>
					</div>
				)}

			{enableConfidenceLevel && review.confidenceLevel != null && (
				<p className="text-sm">
					<span className="text-muted-foreground">Confidence:</span>{" "}
					<span className="font-medium">{review.confidenceLevel}/5</span>
				</p>
			)}

			<div>
				<p className="mb-1 text-sm font-medium">Comments</p>
				{review.comments ? (
					<p className="whitespace-pre-wrap break-words text-sm">
						{review.comments}
					</p>
				) : (
					<p className="text-sm italic text-muted-foreground">
						No comments provided
					</p>
				)}
			</div>

			{review.attachment && (
				<div className="border-t pt-3">
					<p className="mb-1 text-sm font-medium">Attachment</p>
					<a
						href={`/api/files/${review.attachment.id}`}
						className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
					>
						<IconDownload className="size-4" />
						{review.attachment.originalName}
						<span className="text-xs text-muted-foreground">
							({formatFileSize(review.attachment.size)})
						</span>
					</a>
				</div>
			)}

			{review.privateNotes && (
				<div className="border-t pt-3">
					<p className="mb-1 text-sm font-medium text-amber-600 dark:text-amber-400">
						Private Notes (editor only)
					</p>
					<p className="whitespace-pre-wrap break-words rounded bg-amber-50 p-2 text-sm dark:bg-amber-950/20">
						{review.privateNotes}
					</p>
				</div>
			)}
		</SectionCard>
	);
}
