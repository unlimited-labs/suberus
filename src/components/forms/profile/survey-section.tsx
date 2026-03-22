import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { SurveyQuestionField } from "@/components/forms/survey/survey-question-field";
import { Button } from "@/components/ui/button";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { saveUserSurveyAnswersFn } from "@/utils/survey.functions";

interface SurveyQuestion {
	id: string;
	label: string;
	type: SurveyQuestionType;
	options: string[] | null;
	isRequired: boolean;
}

interface SurveyAnswer {
	questionId: string;
	value: string;
}

interface SurveySectionProps {
	questions: SurveyQuestion[];
	initialAnswers: SurveyAnswer[];
}

export function SurveySection({
	questions,
	initialAnswers,
}: SurveySectionProps) {
	const answerMap = new Map(initialAnswers.map((a) => [a.questionId, a.value]));

	const [answers, setAnswers] = useState<Record<string, string>>(() => {
		const init: Record<string, string> = {};
		for (const q of questions) {
			init[q.id] = answerMap.get(q.id) ?? getDefaultValue(q.type);
		}
		return init;
	});
	const [isSaving, setIsSaving] = useState(false);

	const handleChange = (questionId: string, value: string) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const data = Object.entries(answers).map(([questionId, value]) => ({
				questionId,
				value,
			}));
			await saveUserSurveyAnswersFn({ data: { answers: data } });
			toast.success("Survey preferences saved");
		} catch {
			toast.error("Failed to save survey preferences");
		} finally {
			setIsSaving(false);
		}
	};

	if (questions.length === 0) {
		return null;
	}

	return (
		<div className="space-y-4">
			<div className="space-y-3">
				{questions.map((question) => (
					<SurveyQuestionField
						key={question.id}
						question={question}
						value={answers[question.id] ?? getDefaultValue(question.type)}
						onChange={(value) => handleChange(question.id, value)}
					/>
				))}
			</div>

			<div className="flex justify-end pt-2">
				<Button type="button" onClick={handleSave} disabled={isSaving}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save changes
				</Button>
			</div>
		</div>
	);
}

function getDefaultValue(type: SurveyQuestionType): string {
	return type === "CHECKBOX" ? "false" : "";
}
