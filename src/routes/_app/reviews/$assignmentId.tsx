import { IconArrowLeft, IconClipboardCheck } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	ReviewForm,
	type ReviewFormData,
} from "@/components/forms/review/review-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
	assignmentForReviewQueryOptions,
	submitReviewFn,
} from "@/utils/reviews.functions";
import { reviewGuidelinesQueryOptions } from "@/utils/settings.functions";

export const Route = createFileRoute("/_app/reviews/$assignmentId")({
	loader: async ({ params, context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				assignmentForReviewQueryOptions(params.assignmentId),
			),
			context.queryClient.ensureQueryData(reviewGuidelinesQueryOptions()),
		]);
	},
	component: ReviewFormPage,
});

function ReviewFormPage() {
	const { assignmentId } = Route.useParams();
	const router = useRouter();
	const { data } = useSuspenseQuery(
		assignmentForReviewQueryOptions(assignmentId),
	);
	const { data: reviewGuidelines } = useSuspenseQuery(
		reviewGuidelinesQueryOptions(),
	);

	if (!data) {
		return <NotFoundState assignmentId={assignmentId} />;
	}

	const { assignment, submission, config, existingReview } = data;

	const handleSubmit = async (formData: ReviewFormData) => {
		const result = await submitReviewFn({
			data: {
				assignmentId: assignment.id,
				decision: formData.decision,
				comments: formData.comments,
				privateNotes: formData.privateNotes || undefined,
				scores: formData.scores,
				confidenceLevel: config.enableConfidenceLevel
					? formData.confidenceLevel
					: undefined,
			},
		});

		if (result.success) {
			router.navigate({ to: "/reviews" });
		} else {
			console.error("Failed to submit review:", result.error);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconClipboardCheck} title="Submit Review">
				<Link to="/reviews">
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Back to Reviews
					</Button>
				</Link>
			</PageHeader>

			<div className="flex-1 p-6 overflow-auto">
				<ReviewForm
					onSubmit={handleSubmit}
					submission={{
						title: submission.title,
						type: submission.type,
						authors: submission.authors,
						content: submission.content,
						file: submission.file,
					}}
					reviewMode={config.reviewMode}
					guidelines={reviewGuidelines}
					scoringCriteria={config.enableScoring ? config.scoringCriteria : []}
					enableConfidenceLevel={config.enableConfidenceLevel}
					initialData={
						existingReview
							? {
									decision: existingReview.decision,
									comments: existingReview.comments ?? "",
									privateNotes: existingReview.privateNotes ?? "",
									scores: existingReview.scores ?? {},
									confidenceLevel: existingReview.confidenceLevel ?? undefined,
								}
							: undefined
					}
				/>
			</div>
		</div>
	);
}

function NotFoundState({ assignmentId }: { assignmentId: string }) {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconClipboardCheck} title="Review Not Found" />
			<div className="flex-1 p-6 flex items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						Assignment not found: {assignmentId}
					</p>
					<Link to="/reviews">
						<Button variant="outline" className="gap-2">
							<IconArrowLeft className="size-4" />
							Back to Reviews
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
