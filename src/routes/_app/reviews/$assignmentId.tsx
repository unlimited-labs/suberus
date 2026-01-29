import { IconArrowLeft, IconClipboardCheck } from "@tabler/icons-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
	ReviewForm,
	type ReviewFormData,
} from "@/components/forms/review/review-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getAssignmentById } from "@/lib/mock-data/review-assignments";
import { getSubmissionById } from "@/lib/mock-data/submissions";

export const Route = createFileRoute("/_app/reviews/$assignmentId")({
	component: ReviewFormPage,
});

function ReviewFormPage() {
	const { assignmentId } = Route.useParams();
	const router = useRouter();

	const assignment = getAssignmentById(assignmentId);
	const submission = assignment
		? getSubmissionById(assignment.submissionId)
		: null;

	if (!assignment || !submission) {
		return <NotFoundState assignmentId={assignmentId} />;
	}

	const handleSubmit = async (data: ReviewFormData) => {
		// TODO: Replace with actual API call
		console.log("Review submitted:", data);

		// Simulate API delay
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Navigate back to reviews list
		router.navigate({ to: "/reviews" });
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
					}}
					reviewMode={assignment.reviewMode}
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
