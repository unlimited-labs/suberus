import { IconLock, IconMessageCircle } from "@tabler/icons-react";
import type { ReviewFormData } from "@/features/reviews/validations";
import type { ContentFormat } from "@/features/settings/types";
import type { SubmissionType } from "@/generated/prisma/enums";
import { typeLabels } from "@/shared/lib/labels/submission";
import { lookup } from "@/shared/lib/lookup";
import { Badge } from "@/shared/ui/badge";
import { SectionCard } from "@/shared/ui/section-card";
import { AttachmentSection } from "./attachment-section";
import { ConfidenceField } from "./confidence-field";
import { DecisionField } from "./decision-field";
import { useReviewForm } from "./hooks/use-review-form";
import { ReviewSidebar } from "./review-sidebar";
import { ScoringCriteriaField } from "./scoring-criteria-field";
import { SubmissionPreview } from "./submission-preview";

const EMPTY_SCORING_CRITERIA: { name: string; description: string }[] = [];

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
		keywords?: string[];
		previousVersion?: {
			title: string;
			content: string;
			file?: {
				id: string;
				fileName: string;
				originalName: string;
				mimeType: string;
				size: number;
			} | null;
			keywords?: string[];
		} | null;
	};
	contentFormat?: ContentFormat;
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
	contentFormat,
	reviewMode,
	guidelines,
	scoringCriteria = EMPTY_SCORING_CRITERIA,
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
					{lookup(typeLabels, submission.type) ?? submission.type}
				</Badge>
				<h1 className="text-foreground text-xl leading-snug font-semibold">
					{submission.title}
				</h1>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					<SubmissionPreview
						assignmentId={assignmentId}
						contentFormat={contentFormat}
						reviewMode={reviewMode}
						submission={submission}
					/>

					<form
						className="space-y-6"
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							void form.handleSubmit();
						}}
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

						<SectionCard icon={IconMessageCircle} title="Comments to Authors">
							<form.AppField name="comments">
								{(field) => (
									<field.TextareaField
										className="text-foreground"
										description="These comments will be visible to the authors"
										disabled={readOnly}
										label="Review Comments"
										placeholder="Provide detailed feedback on the submission's strengths, weaknesses, and suggestions for improvement..."
										rows={10}
									/>
								)}
							</form.AppField>
						</SectionCard>

						{enableReviewAttachment && (
							<AttachmentSection
								existingAttachment={existingAttachment}
								onAttachmentChange={onAttachmentChange}
								readOnly={readOnly}
							/>
						)}

						<SectionCard icon={IconLock} title="Private Notes">
							<form.AppField name="privateNotes">
								{(field) => (
									<field.TextareaField
										className="text-foreground"
										disabled={readOnly}
										label="Confidential Notes (Optional)"
										placeholder="Internal notes visible only to editors and admins..."
										rows={4}
									/>
								)}
							</form.AppField>
						</SectionCard>

						{!readOnly && (
							<div className="pt-2">
								<form.AppForm>
									<form.SubmitButton
										className="h-12 w-full text-base font-semibold"
										disabled={!allComplete}
										label="Submit Review"
										submittingLabel="Submitting Review..."
									/>
								</form.AppForm>
								{!allComplete && (
									<p className="text-muted-foreground mt-2 text-center text-xs">
										Complete all required sections to submit
									</p>
								)}
							</div>
						)}
					</form>
				</div>

				<div className="space-y-6">
					<ReviewSidebar
						enableConfidenceLevel={enableConfidenceLevel}
						guidelines={guidelines}
						progress={progress}
					/>
				</div>
			</div>
		</div>
	);
}
