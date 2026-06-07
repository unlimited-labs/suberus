import { IconArrowLeft, IconClipboardCheck } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useRef } from "react";
import { toast } from "sonner";
import {
	ReviewForm,
	type ReviewFormData,
} from "@/components/forms/review/review-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
	assignmentForReviewQueryOptions,
	submitReviewFn,
	uploadReviewAttachmentFn,
} from "@/server-fns/reviews";
import { myAssignmentsQueryOptions } from "@/server-fns/reviews/assignments";
import { reviewGuidelinesQueryOptions } from "@/server-fns/settings";
import { userDashboardQueryOptions } from "@/server-fns/user-dashboard";

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
			console.error("Failed to submit review:", result.error);
			return;
		}

		// Upload attachment if present
		const file = attachmentFileRef.current;
		if (file && result.reviewId) {
			try {
				const buffer = await file.arrayBuffer();
				const base64 = btoa(
					new Uint8Array(buffer).reduce(
						(d, byte) => d + String.fromCharCode(byte),
						"",
					),
				);

				const uploadResult = await uploadReviewAttachmentFn({
					data: {
						reviewId: result.reviewId,
						fileName: file.name,
						fileBase64: base64,
					},
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
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Back to Reviews
					</Button>
				</Link>
			</PageHeader>

			<div className="flex-1 p-6 overflow-auto">
				<ReviewForm
					readOnly={isReadOnly}
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
					enableReviewAttachment={config.enableReviewAttachment}
					onAttachmentChange={(file) => {
						attachmentFileRef.current = file;
					}}
					existingAttachment={existingAttachment}
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
