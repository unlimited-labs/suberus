import type { SurveyQuestionType } from "@/generated/prisma/enums";
import {
	isOtherValue,
	makeOther,
	otherText,
} from "@/shared/lib/validations/survey";
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
	allowOther: boolean;
	isRequired: boolean;
}

/** UI-only Select value for the "Other" item; the stored value uses the codec. */
const OTHER_SENTINEL = "__other_select__";
const OTHER_INPUT_MAX = 200;

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
				<div
					className="flex items-start gap-3"
					data-testid="survey-question-field"
				>
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
				<div className="space-y-1.5" data-testid="survey-question-field">
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
			const other = isOtherValue(value);
			return (
				<div className="space-y-1.5" data-testid="survey-question-field">
					<Label htmlFor={`survey-${question.id}`} className="text-sm">
						{question.label}
						{requiredMark}
					</Label>
					<Select
						value={other ? OTHER_SENTINEL : value}
						onValueChange={(v) =>
							onChange(v === OTHER_SENTINEL ? makeOther("") : v)
						}
					>
						<SelectTrigger id={`survey-${question.id}`} className="h-9">
							<SelectValue placeholder="Select an option..." />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem key={option} value={option}>
									{option}
								</SelectItem>
							))}
							{question.allowOther && (
								<SelectItem value={OTHER_SENTINEL}>Other</SelectItem>
							)}
						</SelectContent>
					</Select>
					{other && (
						<Input
							value={otherText(value)}
							onChange={(e) => onChange(makeOther(e.target.value))}
							maxLength={OTHER_INPUT_MAX}
							placeholder="Please specify..."
						/>
					)}
				</div>
			);
		}

		case "MULTI_SELECT": {
			const selected: string[] = value ? safeParseArray(value) : [];
			const setSelected = (next: string[]) => onChange(JSON.stringify(next));
			const otherEntry = selected.find(isOtherValue);
			return (
				<div className="space-y-1.5" data-testid="survey-question-field">
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
										setSelected(
											checked
												? [...selected, option]
												: selected.filter((s) => s !== option),
										);
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
						{question.allowOther && (
							<div className="space-y-1.5">
								<div className="flex items-center gap-2">
									<Checkbox
										id={`survey-${question.id}-other`}
										checked={otherEntry !== undefined}
										onCheckedChange={(checked) => {
											setSelected(
												checked
													? [...selected, makeOther("")]
													: selected.filter((s) => !isOtherValue(s)),
											);
										}}
									/>
									<Label
										htmlFor={`survey-${question.id}-other`}
										className="cursor-pointer text-sm font-normal"
									>
										Other
									</Label>
								</div>
								{otherEntry !== undefined && (
									<Input
										value={otherText(otherEntry)}
										onChange={(e) =>
											setSelected(
												selected.map((s) =>
													isOtherValue(s) ? makeOther(e.target.value) : s,
												),
											)
										}
										maxLength={OTHER_INPUT_MAX}
										placeholder="Please specify..."
									/>
								)}
							</div>
						)}
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
