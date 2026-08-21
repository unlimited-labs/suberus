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
			action={
				<Button
					data-testid="edit-survey-answers"
					onClick={onEdit}
					size="sm"
					variant="outline"
				>
					<IconEdit className="mr-2 size-4" />
					Edit
				</Button>
			}
			icon={IconClipboardList}
			title="Survey Responses"
		>
			{answered.length === 0 ? (
				<p className="text-muted-foreground text-sm">No responses yet</p>
			) : (
				<div
					className="grid gap-3 sm:grid-cols-2"
					data-testid="user-survey-section"
				>
					{answered.map(({ question, answer }) => (
						<div className="flex flex-col gap-0.5" key={question.id}>
							<span className="text-muted-foreground text-xs">
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
