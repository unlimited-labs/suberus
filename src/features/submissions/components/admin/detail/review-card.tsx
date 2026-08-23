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
			action={
				<Badge
					className={lookup(reviewDecisionColors, review.decision)}
					variant="outline"
				>
					{review.decision.replace(/_/g, " ")}
				</Badge>
			}
			contentClassName="space-y-4"
			description={
				showRound ? (
					<span className="text-xs">Round {review.round}</span>
				) : undefined
			}
			title={review.reviewerName}
		>
			{enableScoring &&
				review.scores &&
				Object.keys(review.scores).length > 0 && (
					<div>
						<p className="mb-2 text-sm font-medium">Scores</p>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
							{Object.entries(review.scores).map(([name, score]) => (
								<div
									className="bg-muted/50 flex justify-between rounded px-2 py-1 text-sm"
									key={name}
								>
									<span className="text-muted-foreground mr-2 truncate">
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
					<p className="text-sm wrap-break-word whitespace-pre-wrap">
						{review.comments}
					</p>
				) : (
					<p className="text-muted-foreground text-sm italic">
						No comments provided
					</p>
				)}
			</div>

			{review.attachment && (
				<div className="border-t pt-3">
					<p className="mb-1 text-sm font-medium">Attachment</p>
					<a
						className="text-primary inline-flex items-center gap-2 text-sm hover:underline"
						href={`/api/files/${review.attachment.id}`}
					>
						<IconDownload className="size-4" />
						{review.attachment.originalName}
						<span className="text-muted-foreground text-xs">
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
					<p className="rounded bg-amber-50 p-2 text-sm wrap-break-word whitespace-pre-wrap dark:bg-amber-950/20">
						{review.privateNotes}
					</p>
				</div>
			)}
		</SectionCard>
	);
}
