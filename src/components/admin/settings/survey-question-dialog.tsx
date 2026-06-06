import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import {
	isSelectType,
	OptionsEditor,
	ShowInListFields,
	type SurveyQuestion,
	TypeSelect,
} from "./survey-question-fields";

export interface SurveyQuestionFormValues {
	label: string;
	type: SurveyQuestionType;
	isRequired: boolean;
	options: string[];
	showInUsersList: boolean;
	fieldName: string;
}

interface SurveyQuestionDialogProps {
	question: SurveyQuestion | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (values: SurveyQuestionFormValues) => void;
	isBusy: boolean;
}

export function SurveyQuestionDialog({
	question,
	open,
	onOpenChange,
	onSubmit,
	isBusy,
}: SurveyQuestionDialogProps) {
	const [label, setLabel] = useState("");
	const [type, setType] = useState<SurveyQuestionType>("CHECKBOX");
	const [isRequired, setIsRequired] = useState(false);
	const [options, setOptions] = useState<string[]>([]);
	const [showInUsersList, setShowInUsersList] = useState(false);
	const [fieldName, setFieldName] = useState("");
	const [attempted, setAttempted] = useState(false);

	// Seed the form whenever a new question is opened for editing.
	useEffect(() => {
		if (!question) return;
		setLabel(question.label);
		setType(question.type);
		setIsRequired(question.isRequired);
		setOptions(Array.isArray(question.options) ? question.options : []);
		setShowInUsersList(question.showInUsersList);
		setFieldName(question.fieldName ?? "");
		setAttempted(false);
	}, [question]);

	const optionCount = options.filter((o) => o.trim()).length;
	const missingOptions = isSelectType(type) && optionCount < 2;
	const missingFieldName = showInUsersList && !fieldName.trim();
	const isValid =
		label.trim().length > 0 && !missingOptions && !missingFieldName;

	const handleSave = () => {
		if (!isValid) {
			setAttempted(true);
			return;
		}
		onSubmit({ label, type, isRequired, options, showInUsersList, fieldName });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit question</DialogTitle>
					<DialogDescription>
						Update how this survey question is presented and where its answers
						appear.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-1">
					<div className="space-y-1.5">
						<Label htmlFor="sq-label">Question label</Label>
						<Input
							id="sq-label"
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							placeholder="Question label..."
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="sq-type">Type</Label>
							<TypeSelect id="sq-type" value={type} onChange={setType} />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="sq-required">Required</Label>
							<div className="flex h-9 items-center">
								<Switch
									id="sq-required"
									checked={isRequired}
									onCheckedChange={setIsRequired}
								/>
							</div>
						</div>
					</div>

					{isSelectType(type) && (
						<div className="space-y-1">
							<OptionsEditor options={options} onChange={setOptions} />
							{attempted && missingOptions && (
								<p className="text-xs text-destructive">
									Select questions require at least 2 options.
								</p>
							)}
						</div>
					)}

					<Separator />

					<div className="space-y-1.5">
						<p className="text-sm font-medium text-muted-foreground">
							Users list
						</p>
						<ShowInListFields
							idPrefix="dialog"
							showInList={showInUsersList}
							fieldName={fieldName}
							onShowInListChange={setShowInUsersList}
							onFieldNameChange={setFieldName}
							error={
								attempted && missingFieldName
									? "Field name is required to show in users list"
									: undefined
							}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isBusy || !label.trim()}>
						{isBusy ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
