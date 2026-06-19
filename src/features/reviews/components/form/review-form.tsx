import { IconLock, IconMessageCircle } from "@tabler/icons-react";
import type { ReviewFormData } from "@/features/reviews/validations";
import type { SubmissionType } from "@/generated/prisma/enums";
import { AttachmentSection } from "./attachment-section";
import { ConfidenceField } from "./confidence-field";
import { DecisionField } from "./decision-field";
import { useReviewForm } from "./hooks/use-review-form";
import { ReviewSidebar } from "./review-sidebar";
import { ScoringCriteriaField } from "./scoring-criteria-field";
import { SubmissionPreview } from "./submission-preview";

interface SubmissionAuthor {
	firstName: string;
	lastName: string;
	affiliationName: string | null;
	isPresenter: boolean;
}

interface ReviewFormProps {
	onSubmit: (data: ReviewFormData) => Promise<void>;
	initialData?: Partial<ReviewFormData>;
	assignmentId: string;
	submission: {
		title: string;
		type: SubmissionType | string;
		authors: SubmissionAuthor[];
		content?: string;
		file?: {
			id: string;
			fileName: string;
			originalName: string;
			mimeType: string;
			size: number;
		} | null;
		previousVersion?: { title: string; content: string } | null;
	};
	reviewMode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND";
	guidelines?: string;
	scoringCriteria?: { name: string; description: string }[];
	enableConfidenceLevel?: boolean;
	enableReviewAttachment?: boolean;
	onAttachmentChange?: (file: File | null) => void;
	existingAttachment?: {
		id: string;
		fileName: string;
		originalName: string;
		size: number;
	};
	readOnly?: boolean;
}

export function ReviewForm({
	onSubmit,
	initialData,
	assignmentId,
	submission,
	reviewMode,
	guidelines,
	scoringCriteria = [],
	enableConfidenceLevel = true,
	enableReviewAttachment = false,
	onAttachmentChange,
	existingAttachment,
	readOnly = false,
}: ReviewFormProps) {
	const { form, progress, allComplete } = useReviewForm({
		onSubmit,
		initialData,
		scoringCriteria,
		enableConfidenceLevel,
	});

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
				{/* Main Form */}
				<div className="overflow-hidden rounded-2xl bg-card shadow-2xl">
					<div className="p-8">
						<SubmissionPreview
							submission={submission}
							reviewMode={reviewMode}
							assignmentId={assignmentId}
						/>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void form.handleSubmit();
							}}
							className="space-y-6"
						>
							<DecisionField form={form} readOnly={readOnly} />

							{scoringCriteria.length > 0 && (
								<>
									<div className="border-t" />
									<ScoringCriteriaField
										form={form}
										readOnly={readOnly}
										scoringCriteria={scoringCriteria}
									/>
								</>
							)}

							{enableConfidenceLevel && (
								<>
									<div className="border-t" />
									<ConfidenceField form={form} readOnly={readOnly} />
								</>
							)}

							<div className="border-t" />

							{/* Comments Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconMessageCircle className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Comments to Authors
									</h2>
								</div>

								<form.AppField name="comments">
									{(field) => (
										<field.TextareaField
											label="Review Comments"
											rows={10}
											placeholder="Provide detailed feedback on the submission's strengths, weaknesses, and suggestions for improvement..."
											className="text-foreground"
											description="These comments will be visible to the authors"
											disabled={readOnly}
										/>
									)}
								</form.AppField>
							</div>

							{enableReviewAttachment && (
								<>
									<div className="border-t" />
									<AttachmentSection
										readOnly={readOnly}
										onAttachmentChange={onAttachmentChange}
										existingAttachment={existingAttachment}
									/>
								</>
							)}

							<div className="border-t" />

							{/* Private Notes Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconLock className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Private Notes
									</h2>
								</div>

								<form.AppField name="privateNotes">
									{(field) => (
										<field.TextareaField
											label="Confidential Notes (Optional)"
											rows={4}
											placeholder="Internal notes visible only to editors and admins..."
											className="text-foreground"
											description="Only visible to editors and administrators"
											disabled={readOnly}
										/>
									)}
								</form.AppField>
							</div>

							{/* Submit Section */}
							{!readOnly && (
								<div className="pt-4">
									<form.AppForm>
										<form.SubmitButton
											label="Submit Review"
											submittingLabel="Submitting Review..."
											disabled={!allComplete}
											className="w-full h-12 text-base font-semibold"
										/>
									</form.AppForm>
									{!allComplete && (
										<p className="text-xs text-muted-foreground text-center mt-2">
											Complete all required sections to submit
										</p>
									)}
								</div>
							)}
						</form>
					</div>
				</div>

				<ReviewSidebar
					progress={progress}
					enableConfidenceLevel={enableConfidenceLevel}
					guidelines={guidelines}
				/>
			</div>
		</div>
	);
}
