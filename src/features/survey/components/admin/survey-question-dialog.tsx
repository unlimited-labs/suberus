import type { SurveyQuestionFormValues } from "@/features/survey/validations";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { FieldError } from "@/shared/ui/field";
import { Separator } from "@/shared/ui/separator";
import {
	isSelectType,
	OptionsEditor,
	type SurveyQuestion,
	surveyTypeOptions,
} from "./survey-question-fields";
import { useSurveyQuestionForm } from "./use-survey-question-form";

interface SurveyQuestionDialogProps {
	question: SurveyQuestion | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (values: SurveyQuestionFormValues) => Promise<void>;
}

export function SurveyQuestionDialog({
	question,
	open,
	onOpenChange,
	onSave,
}: SurveyQuestionDialogProps) {
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
				{/* Remount per question (key) so form defaults re-seed without effects. */}
				{question && (
					<SurveyQuestionDialogForm
						key={question.id}
						question={question}
						onSave={onSave}
						onCancel={() => onOpenChange(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function SurveyQuestionDialogForm({
	question,
	onSave,
	onCancel,
}: {
	question: SurveyQuestion;
	onSave: (values: SurveyQuestionFormValues) => Promise<void>;
	onCancel: () => void;
}) {
	const form = useSurveyQuestionForm(question, async (values) => {
		await onSave(values);
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.AppField name="label">
				{(field) => (
					<field.InputField
						label="Question label"
						placeholder="Question label..."
					/>
				)}
			</form.AppField>

			<div className="grid grid-cols-2 gap-3">
				<form.AppField name="type">
					{(field) => (
						<field.SelectField label="Type" options={surveyTypeOptions} />
					)}
				</form.AppField>
				<form.AppField name="isRequired">
					{(field) => <field.SwitchField label="Required" />}
				</form.AppField>
			</div>

			<form.Subscribe selector={(s) => s.values.type}>
				{(type) =>
					isSelectType(type) ? (
						<div className="space-y-3">
							<form.Field name="options">
								{(field) => (
									<div className="space-y-1">
										<OptionsEditor
											options={field.state.value}
											onChange={field.handleChange}
										/>
										<form.Subscribe selector={(s) => s.submissionAttempts}>
											{(attempts) => (
												<FieldError
													errors={
														attempts > 0 ? field.state.meta.errors : undefined
													}
												/>
											)}
										</form.Subscribe>
									</div>
								)}
							</form.Field>
							<form.AppField name="allowOther">
								{(field) => (
									<field.SwitchField label="Allow 'Other' (free text)" />
								)}
							</form.AppField>
						</div>
					) : null
				}
			</form.Subscribe>

			<Separator />

			<div className="space-y-2">
				<p className="text-sm font-medium text-muted-foreground">Users list</p>
				<form.AppField name="showInUsersList">
					{(field) => <field.SwitchField label="Show in users list" />}
				</form.AppField>
				<form.Subscribe selector={(s) => s.values.showInUsersList}>
					{(show) =>
						show ? (
							<form.AppField name="fieldName">
								{(field) => (
									<field.InputField
										label="Field name"
										placeholder="Field name..."
										description="Name shown as a column in the Users list and as the XLSX export header."
									/>
								)}
							</form.AppField>
						) : null
					}
				</form.Subscribe>
			</div>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<form.AppForm>
					<form.SubmitButton label="Save" submittingLabel="Saving..." />
				</form.AppForm>
			</DialogFooter>
		</form>
	);
}
