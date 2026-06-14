import { IconPlus, IconX } from "@tabler/icons-react";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

export interface SurveyQuestion {
	id: string;
	label: string;
	type: SurveyQuestionType;
	options: string[] | null;
	isRequired: boolean;
	orderIndex: number;
	isActive: boolean;
	showInUsersList: boolean;
	fieldName: string | null;
}

export const TYPE_LABELS: Record<SurveyQuestionType, string> = {
	CHECKBOX: "Checkbox",
	TEXT: "Text",
	SINGLE_SELECT: "Single",
	MULTI_SELECT: "Multi",
};

/** Option set for the type `SelectField` (full labels for the edit dialog). */
export const surveyTypeOptions = [
	{ value: "CHECKBOX", label: "Checkbox" },
	{ value: "TEXT", label: "Text" },
	{ value: "SINGLE_SELECT", label: "Single Select" },
	{ value: "MULTI_SELECT", label: "Multi Select" },
] as const satisfies readonly { value: SurveyQuestionType; label: string }[];

export const isSelectType = (type: SurveyQuestionType) =>
	type === "SINGLE_SELECT" || type === "MULTI_SELECT";

/** Compact, controlled type picker used by the inline add form. */
export function TypeSelect({
	value,
	onChange,
	className,
}: {
	value: SurveyQuestionType;
	onChange: (v: SurveyQuestionType) => void;
	className?: string;
}) {
	return (
		<Select
			value={value}
			onValueChange={(v) => {
				const found = surveyTypeOptions.find((t) => t.value === v);
				if (found) onChange(found.value);
			}}
		>
			<SelectTrigger className={className}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{surveyTypeOptions.map((opt) => (
					<SelectItem key={opt.value} value={opt.value}>
						{opt.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/** Controlled editor for select-question options (value + onChange). */
export function OptionsEditor({
	options,
	onChange,
}: {
	options: string[];
	onChange: (options: string[]) => void;
}) {
	return (
		<div className="space-y-1.5 rounded-md border border-border/50 bg-background p-3">
			<Label className="text-xs font-medium text-muted-foreground">
				Options
			</Label>
			{/* Index keys: keying by value remounts the input on every keystroke
			    (and duplicates collide while two empty options exist). */}
			{options.map((opt, i) => (
				<div key={i} className="flex gap-1.5">
					<Input
						value={opt}
						onChange={(e) => {
							const next = [...options];
							next[i] = e.target.value;
							onChange(next);
						}}
						placeholder={`Option ${i + 1}`}
						className="h-8 text-sm"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={() => onChange(options.filter((_, j) => j !== i))}
						aria-label="Remove option"
					>
						<IconX className="size-3.5" />
					</Button>
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onChange([...options, ""])}
			>
				<IconPlus className="mr-1 size-3" />
				Add option
			</Button>
		</div>
	);
}
