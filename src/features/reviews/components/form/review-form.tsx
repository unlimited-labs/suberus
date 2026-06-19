import { IconLock, IconMessageCircle } from "@tabler/icons-react";
import type { ReviewFormData } from "@/features/reviews/validations";
import type { SubmissionType } from "@/generated/prisma/enums";
import { typeLabels } from "@/shared/lib/labels/submission";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
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
		<div className="mx-auto w-full max-w-6xl space-y-6">
			<div className="space-y-2">
				<Badge variant="outline">
					{typeLabels[submission.type as SubmissionType] ?? submission.type}
				</Badge>
				<h1 className="text-xl font-semibold leading-snug text-foreground">
					{submission.title}
				</h1>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
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
							<ScoringCriteriaField
								form={form}
								readOnly={readOnly}
								scoringCriteria={scoringCriteria}
							/>
						)}

						{enableConfidenceLevel && (
							<ConfidenceField form={form} readOnly={readOnly} />
						)}

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<IconMessageCircle className="size-5 text-muted-foreground" />
									Comments to Authors
								</CardTitle>
							</CardHeader>
							<CardContent>
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
							</CardContent>
						</Card>

						{enableReviewAttachment && (
							<AttachmentSection
								readOnly={readOnly}
								onAttachmentChange={onAttachmentChange}
								existingAttachment={existingAttachment}
							/>
						)}

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<IconLock className="size-5 text-muted-foreground" />
									Private Notes
								</CardTitle>
							</CardHeader>
							<CardContent>
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
							</CardContent>
						</Card>

						{!readOnly && (
							<div className="pt-2">
								<form.AppForm>
									<form.SubmitButton
										label="Submit Review"
										submittingLabel="Submitting Review..."
										disabled={!allComplete}
										className="h-12 w-full text-base font-semibold"
									/>
								</form.AppForm>
								{!allComplete && (
									<p className="mt-2 text-center text-xs text-muted-foreground">
										Complete all required sections to submit
									</p>
								)}
							</div>
						)}
					</form>
				</div>

				<div className="space-y-6">
					<ReviewSidebar
						progress={progress}
						enableConfidenceLevel={enableConfidenceLevel}
						guidelines={guidelines}
					/>
				</div>
			</div>
		</div>
	);
}
