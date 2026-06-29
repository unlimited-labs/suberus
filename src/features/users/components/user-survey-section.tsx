import { IconClipboardList, IconEdit } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminSurveyQuestionsQueryOptions } from "@/features/survey/api/survey";
import { formatSurveyAnswerValue } from "@/features/survey/labels";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";

interface UserSurveySectionProps {
	surveyAnswers: { questionId: string; value: string }[];
	onEdit: () => void;
}

export function UserSurveySection({
	surveyAnswers,
	onEdit,
}: UserSurveySectionProps) {
	const { data: questions } = useSuspenseQuery(
		adminSurveyQuestionsQueryOptions(),
	);

	const activeQuestions = questions.filter((q) => q.isActive);
	if (activeQuestions.length === 0) return null;

	const answered = activeQuestions
		.map((q) => ({
			question: q,
			answer: surveyAnswers.find((a) => a.questionId === q.id),
		}))
		.filter((row) => row.answer !== undefined);

	return (
		<SectionCard
			icon={IconClipboardList}
			title="Survey Responses"
			action={
				<Button
					variant="outline"
					size="sm"
					onClick={onEdit}
					data-testid="edit-survey-answers"
				>
					<IconEdit className="mr-2 size-4" />
					Edit
				</Button>
			}
		>
			{answered.length === 0 ? (
				<p className="text-sm text-muted-foreground">No responses yet</p>
			) : (
				<div
					data-testid="user-survey-section"
					className="grid gap-3 sm:grid-cols-2"
				>
					{answered.map(({ question, answer }) => (
						<div key={question.id} className="flex flex-col gap-0.5">
							<span className="text-xs text-muted-foreground">
								{question.label}
							</span>
							<span className="text-sm">
								{formatSurveyAnswerValue(question.type, answer?.value ?? "")}
							</span>
						</div>
					))}
				</div>
			)}
		</SectionCard>
	);
}
