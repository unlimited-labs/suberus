import { IconClipboardList } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminSurveyQuestionsQueryOptions } from "@/features/survey/api/survey";
import { formatSurveyAnswerValue } from "@/features/survey/labels";

interface UserSurveySectionProps {
	surveyAnswers: { questionId: string; value: string }[];
}

export function UserSurveySection({ surveyAnswers }: UserSurveySectionProps) {
	const { data: questions } = useSuspenseQuery(
		adminSurveyQuestionsQueryOptions(),
	);

	const answered = questions
		.map((q) => ({
			question: q,
			answer: surveyAnswers.find((a) => a.questionId === q.id),
		}))
		.filter((row) => row.answer !== undefined);

	if (answered.length === 0) return null;

	return (
		<div data-testid="user-survey-section" className="space-y-3">
			<h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<IconClipboardList className="size-4" />
				Survey Responses
			</h3>
			<div className="grid gap-3 sm:grid-cols-2">
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
		</div>
	);
}
