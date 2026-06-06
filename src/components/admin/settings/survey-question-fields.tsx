import { IconPlus, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SurveyQuestionType } from "@/generated/prisma/enums";

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

export const SURVEY_QUESTION_TYPES = [
	"CHECKBOX",
	"TEXT",
	"SINGLE_SELECT",
	"MULTI_SELECT",
] as const satisfies readonly SurveyQuestionType[];

export const isSelectType = (type: SurveyQuestionType) =>
	type === "SINGLE_SELECT" || type === "MULTI_SELECT";

export function TypeSelect({
	value,
	onChange,
	id,
	className,
}: {
	value: SurveyQuestionType;
	onChange: (v: SurveyQuestionType) => void;
	id?: string;
	className?: string;
}) {
	return (
		<Select
			value={value}
			onValueChange={(v) => {
				const found = SURVEY_QUESTION_TYPES.find((t) => t === v);
				if (found) onChange(found);
			}}
		>
			<SelectTrigger id={id} className={className}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="CHECKBOX">Checkbox</SelectItem>
				<SelectItem value="TEXT">Text</SelectItem>
				<SelectItem value="SINGLE_SELECT">Single Select</SelectItem>
				<SelectItem value="MULTI_SELECT">Multi Select</SelectItem>
			</SelectContent>
		</Select>
	);
}

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
			{options.map((opt, i) => (
				<div key={opt} className="flex gap-1.5">
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

export function ShowInListFields({
	idPrefix,
	showInList,
	fieldName,
	onShowInListChange,
	onFieldNameChange,
	error,
}: {
	idPrefix: string;
	showInList: boolean;
	fieldName: string;
	onShowInListChange: (v: boolean) => void;
	onFieldNameChange: (v: string) => void;
	error?: string;
}) {
	return (
		<div className="space-y-2 rounded-md border border-border/50 bg-background p-3">
			<div className="flex items-center gap-2">
				<Switch
					id={`show-in-list-${idPrefix}`}
					checked={showInList}
					onCheckedChange={onShowInListChange}
				/>
				<Label htmlFor={`show-in-list-${idPrefix}`} className="text-sm">
					Show in users list
				</Label>
			</div>
			{showInList && (
				<div className="space-y-1">
					<Input
						value={fieldName}
						onChange={(e) => onFieldNameChange(e.target.value)}
						placeholder="Field name..."
						className="h-8 text-sm"
						aria-label="Field name"
						aria-invalid={error ? true : undefined}
					/>
					{error ? (
						<p className="text-xs text-destructive">{error}</p>
					) : (
						<p className="text-xs text-muted-foreground">
							Name shown as a column in the Users list and as the XLSX export
							header.
						</p>
					)}
				</div>
			)}
		</div>
	);
}
