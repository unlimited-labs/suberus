import { useState } from "react";
import type { SurveyQuestionFormValues } from "@/features/survey/validations";
import { SurveyQuestionField } from "@/shared/components/survey-question-field";
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
import {
	isSelectType,
	OptionsEditor,
	type SurveyQuestion,
	TypePicker,
} from "./survey-question-fields";
import { useSurveyQuestionForm } from "./use-survey-question-form";

interface SurveyQuestionDialogProps {
	/** `open` with no `question` = add mode; with a `question` = edit mode. */
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
	const isEdit = question !== null;
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit question" : "Add question"}</DialogTitle>
					<DialogDescription>
						Configure the question and preview how attendees will see it.
					</DialogDescription>
				</DialogHeader>
				{/* Remount per question / mode (key) so defaults re-seed without effects. */}
				{open && (
					<SurveyQuestionDialogForm
						key={question?.id ?? "new"}
						question={question}
						isEdit={isEdit}
						onSave={onSave}
						onCancel={() => onOpenChange(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function SectionLabel({ children }: { children: string }) {
	return (
		<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
			{children}
		</p>
	);
}

function SurveyQuestionDialogForm({
	question,
	isEdit,
	onSave,
	onCancel,
}: {
	question: SurveyQuestion | null;
	isEdit: boolean;
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
			className="grid gap-6 md:grid-cols-[1fr_minmax(260px,320px)]"
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<SectionLabel>Content</SectionLabel>
					<form.AppField name="label">
						{(field) => (
							<field.InputField
								label="Question label"
								placeholder="Question label..."
							/>
						)}
					</form.AppField>
				</div>

				<div className="space-y-2">
					<SectionLabel>Type</SectionLabel>
					<form.Field name="type">
						{(field) => (
							<TypePicker
								value={field.state.value}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
				</div>

				<form.Subscribe selector={(s) => s.values.type}>
					{(type) =>
						isSelectType(type) ? (
							<div className="space-y-2">
								<SectionLabel>Options</SectionLabel>
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

				<div className="space-y-2">
					<SectionLabel>Behavior</SectionLabel>
					<form.AppField name="isRequired">
						{(field) => <field.SwitchField label="Required" />}
					</form.AppField>
				</div>

				<div className="space-y-2">
					<SectionLabel>Users list</SectionLabel>
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

				<DialogFooter className="md:col-span-2">
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
					<form.AppForm>
						<form.SubmitButton
							label={isEdit ? "Save" : "Add"}
							submittingLabel={isEdit ? "Saving..." : "Adding..."}
						/>
					</form.AppForm>
				</DialogFooter>
			</div>

			<div className="space-y-2 md:sticky md:top-0 md:self-start">
				<SectionLabel>Preview</SectionLabel>
				<div className="rounded-lg border bg-muted/20 p-4">
					<form.Subscribe
						selector={(s) => ({
							label: s.values.label,
							type: s.values.type,
							options: s.values.options,
							allowOther: s.values.allowOther,
							isRequired: s.values.isRequired,
						})}
					>
						{/* key on type: remount resets the throwaway answer when the
						    stored-value encoding changes between types. */}
						{(v) => <QuestionPreview key={v.type} values={v} />}
					</form.Subscribe>
				</div>
			</div>
		</form>
	);
}

type PreviewValues = Pick<
	SurveyQuestionFormValues,
	"label" | "type" | "options" | "allowOther" | "isRequired"
>;

/** Renders the real attendee-facing field with a throwaway local answer. */
function QuestionPreview({ values }: { values: PreviewValues }) {
	const [answer, setAnswer] = useState("");

	return (
		<SurveyQuestionField
			question={{
				id: "preview",
				label: values.label.trim() || "Survey question",
				type: values.type,
				options: isSelectType(values.type)
					? values.options.filter((o) => o.trim())
					: null,
				allowOther: values.allowOther,
				isRequired: values.isRequired,
			}}
			value={answer}
			onChange={setAnswer}
		/>
	);
}
