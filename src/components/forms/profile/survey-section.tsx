import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { saveUserSurveyAnswersFn } from "@/utils/survey.functions";

interface SurveyQuestion {
	id: string;
	label: string;
}

interface SurveyAnswer {
	questionId: string;
	value: boolean;
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

	const [answers, setAnswers] = useState<Record<string, boolean>>(() => {
		const init: Record<string, boolean> = {};
		for (const q of questions) {
			init[q.id] = answerMap.get(q.id) ?? false;
		}
		return init;
	});
	const [isSaving, setIsSaving] = useState(false);

	const handleToggle = (questionId: string, checked: boolean) => {
		setAnswers((prev) => ({ ...prev, [questionId]: checked }));
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
		return (
			<p className="text-sm text-muted-foreground">
				No survey questions available.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<div className="space-y-3">
				{questions.map((question) => (
					<div key={question.id} className="flex items-start gap-3">
						<Checkbox
							id={`survey-${question.id}`}
							checked={answers[question.id] ?? false}
							onCheckedChange={(checked) =>
								handleToggle(question.id, checked === true)
							}
							className="mt-0.5"
						/>
						<Label
							htmlFor={`survey-${question.id}`}
							className="cursor-pointer text-sm font-normal leading-snug"
						>
							{question.label}
						</Label>
					</div>
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
