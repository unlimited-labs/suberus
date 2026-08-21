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
						checked={value === "true"}
						className="mt-0.5"
						id={`survey-${question.id}`}
						onCheckedChange={(checked) =>
							onChange(checked === true ? "true" : "false")
						}
					/>
					<Label
						className="cursor-pointer text-sm leading-snug font-normal"
						htmlFor={`survey-${question.id}`}
					>
						{question.label}
						{requiredMark}
					</Label>
				</div>
			);

		case "TEXT":
			return (
				<div className="space-y-1.5" data-testid="survey-question-field">
					<Label className="text-sm" htmlFor={`survey-${question.id}`}>
						{question.label}
						{requiredMark}
					</Label>
					<Input
						id={`survey-${question.id}`}
						maxLength={500}
						onChange={(e) => onChange(e.target.value)}
						placeholder="Type your answer..."
						value={value}
					/>
				</div>
			);

		case "SINGLE_SELECT": {
			const options = question.options ?? [];
			const other = isOtherValue(value);
			return (
				<div className="space-y-1.5" data-testid="survey-question-field">
					<Label className="text-sm" htmlFor={`survey-${question.id}`}>
						{question.label}
						{requiredMark}
					</Label>
					<Select
						items={[
							...options.map((option) => ({ value: option, label: option })),
							...(question.allowOther
								? [{ value: OTHER_SENTINEL, label: "Other" }]
								: []),
						]}
						onValueChange={(v) =>
							onChange(v === OTHER_SENTINEL ? makeOther("") : v)
						}
						value={other ? OTHER_SENTINEL : value}
					>
						<SelectTrigger className="h-9" id={`survey-${question.id}`}>
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
							maxLength={OTHER_INPUT_MAX}
							onChange={(e) => onChange(makeOther(e.target.value))}
							placeholder="Please specify..."
							value={otherText(value)}
						/>
					)}
				</div>
			);
		}

		case "MULTI_SELECT": {
			const selected: string[] = value ? safeParseArray(value) : [];
			const selectedSet = new Set(selected);
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
							<div className="flex items-center gap-2" key={option}>
								<Checkbox
									checked={selectedSet.has(option)}
									id={`survey-${question.id}-${option}`}
									onCheckedChange={(checked) => {
										setSelected(
											checked
												? [...selected, option]
												: selected.filter((s) => s !== option),
										);
									}}
								/>
								<Label
									className="cursor-pointer text-sm font-normal"
									htmlFor={`survey-${question.id}-${option}`}
								>
									{option}
								</Label>
							</div>
						))}
						{question.allowOther && (
							<div className="space-y-1.5">
								<div className="flex items-center gap-2">
									<Checkbox
										checked={otherEntry !== undefined}
										id={`survey-${question.id}-other`}
										onCheckedChange={(checked) => {
											setSelected(
												checked
													? [...selected, makeOther("")]
													: selected.filter((s) => !isOtherValue(s)),
											);
										}}
									/>
									<Label
										className="cursor-pointer text-sm font-normal"
										htmlFor={`survey-${question.id}-other`}
									>
										Other
									</Label>
								</div>
								{otherEntry !== undefined && (
									<Input
										maxLength={OTHER_INPUT_MAX}
										onChange={(e) =>
											setSelected(
												selected.map((s) =>
													isOtherValue(s) ? makeOther(e.target.value) : s,
												),
											)
										}
										placeholder="Please specify..."
										value={otherText(otherEntry)}
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
