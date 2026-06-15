import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

export interface SurveyQuestionData {
	id: string;
	label: string;
	type: SurveyQuestionType;
	options: string[] | null;
	isRequired: boolean;
}

interface SurveyQuestionFieldProps {
	question: SurveyQuestionData;
	value: string;
	onChange: (value: string) => void;
}

// Relocated from features/survey unchanged; CRAP is the per-type render switch,
// not new complexity. Component-level branching, not worth splitting.
// fallow-ignore-next-line complexity
export function SurveyQuestionField({
	question,
	value,
	onChange,
}: SurveyQuestionFieldProps) {
	const requiredMark = question.isRequired ? " *" : "";

	switch (question.type) {
		case "CHECKBOX":
			return (
				<div className="flex items-start gap-3">
					<Checkbox
						id={`survey-${question.id}`}
						checked={value === "true"}
						onCheckedChange={(checked) =>
							onChange(checked === true ? "true" : "false")
						}
						className="mt-0.5"
					/>
					<Label
						htmlFor={`survey-${question.id}`}
						className="cursor-pointer text-sm font-normal leading-snug"
					>
						{question.label}
						{requiredMark}
					</Label>
				</div>
			);

		case "TEXT":
			return (
				<div className="space-y-1.5">
					<Label htmlFor={`survey-${question.id}`} className="text-sm">
						{question.label}
						{requiredMark}
					</Label>
					<Input
						id={`survey-${question.id}`}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						maxLength={500}
						placeholder="Type your answer..."
					/>
				</div>
			);

		case "SINGLE_SELECT": {
			const options = question.options ?? [];
			return (
				<div className="space-y-1.5">
					<Label htmlFor={`survey-${question.id}`} className="text-sm">
						{question.label}
						{requiredMark}
					</Label>
					<Select value={value} onValueChange={onChange}>
						<SelectTrigger id={`survey-${question.id}`} className="h-9">
							<SelectValue placeholder="Select an option..." />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			);
		}

		case "MULTI_SELECT": {
			const selected: string[] = value ? safeParseArray(value) : [];
			return (
				<div className="space-y-1.5">
					<Label className="text-sm">
						{question.label}
						{requiredMark}
					</Label>
					<div className="space-y-2">
						{(question.options ?? []).map((option) => (
							<div key={option} className="flex items-center gap-2">
								<Checkbox
									id={`survey-${question.id}-${option}`}
									checked={selected.includes(option)}
									onCheckedChange={(checked) => {
										const next = checked
											? [...selected, option]
											: selected.filter((s) => s !== option);
										onChange(JSON.stringify(next));
									}}
								/>
								<Label
									htmlFor={`survey-${question.id}-${option}`}
									className="cursor-pointer text-sm font-normal"
								>
									{option}
								</Label>
							</div>
						))}
					</div>
				</div>
			);
		}
	}
}

function safeParseArray(value: string): string[] {
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
