import { IconArrowLeft, IconClipboardCheck } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";
import { userDashboardQueryOptions } from "@/features/dashboard/api/user-dashboard";
import {
	assignmentForReviewQueryOptions,
	submitReviewFn,
	uploadReviewAttachmentFn,
} from "@/features/reviews/api";
import { myAssignmentsQueryOptions } from "@/features/reviews/api/assignments";
import { ReviewForm } from "@/features/reviews/components/form/review-form";
import type { ReviewFormData } from "@/features/reviews/validations";
import { reviewGuidelinesQueryOptions } from "@/features/settings/api/settings";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/button";

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
	const queryClient = useQueryClient();
	const { data } = useSuspenseQuery(
		assignmentForReviewQueryOptions(assignmentId),
	);
	const { data: reviewGuidelines } = useSuspenseQuery(
		reviewGuidelinesQueryOptions(),
	);
	const attachmentFileRef = useRef<File | null>(null);

	if (!data) {
		return <NotFoundState assignmentId={assignmentId} />;
	}

	const { assignment, submission, config, existingReview, existingAttachment } =
		data;
	const isReadOnly = assignment.status === "COMPLETED";

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

		if (!result.success) {
			toast.error(result.error ?? "Failed to submit review");
			return;
		}

		const file = attachmentFileRef.current;
		if (file && result.reviewId) {
			try {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("reviewId", result.reviewId);

				const uploadResult = await uploadReviewAttachmentFn({
					data: formData,
				});

				if (!uploadResult.success) {
					toast.error(
						`Review submitted but file upload failed: ${uploadResult.error}`,
					);
				}
			} catch {
				toast.error("Review submitted but file upload failed");
			}
		}

		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: myAssignmentsQueryOptions().queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: assignmentForReviewQueryOptions(assignmentId).queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: userDashboardQueryOptions().queryKey,
			}),
		]);
		router.navigate({ to: "/reviews" });
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader
				icon={IconClipboardCheck}
				title={isReadOnly ? "View Review" : "Submit Review"}
			>
				<Link to="/reviews">
					<Button className="gap-2" variant="outline">
						<IconArrowLeft className="size-4" />
						Back to Reviews
					</Button>
				</Link>
			</PageHeader>

			<div className="fade flex-1 overflow-auto p-6">
				<ReviewForm
					assignmentId={assignment.id}
					contentFormat={config.contentFormat}
					enableConfidenceLevel={config.enableConfidenceLevel}
					enableReviewAttachment={config.enableReviewAttachment}
					existingAttachment={existingAttachment}
					guidelines={reviewGuidelines}
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
					onAttachmentChange={(file) => {
						attachmentFileRef.current = file;
					}}
					onSubmit={handleSubmit}
					readOnly={isReadOnly}
					reviewMode={config.reviewMode}
					scoringCriteria={config.enableScoring ? config.scoringCriteria : []}
					submission={{
						title: submission.title,
						type: submission.type,
						authors: submission.authors,
						content: submission.content,
						file: submission.file,
						keywords: submission.keywords,
						previousVersion: submission.previousVersion,
					}}
				/>
			</div>
		</div>
	);
}

function NotFoundState({ assignmentId }: { assignmentId: string }) {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconClipboardCheck} title="Review Not Found" />
			<div className="flex flex-1 items-center justify-center p-6">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						Assignment not found: {assignmentId}
					</p>
					<Link to="/reviews">
						<Button className="gap-2" variant="outline">
							<IconArrowLeft className="size-4" />
							Back to Reviews
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
