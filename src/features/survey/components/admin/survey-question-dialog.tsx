import { useState } from "react";
import type { SurveyQuestionFormValues } from "@/features/survey/validations";
import { Form } from "@/shared/components/composable/form";
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
	AudiencePicker,
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
	exhibitorsEnabled: boolean;
}

export function SurveyQuestionDialog({
	question,
	open,
	onOpenChange,
	onSave,
	exhibitorsEnabled,
}: SurveyQuestionDialogProps) {
	const isEdit = question !== null;
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="fade-y max-h-[90vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit question" : "Add question"}</DialogTitle>
					<DialogDescription>
						Configure the question and preview how attendees will see it.
					</DialogDescription>
				</DialogHeader>
				{/* Remount per question / mode (key) so defaults re-seed without effects. */}
				{open && (
					<SurveyQuestionDialogForm
						exhibitorsEnabled={exhibitorsEnabled}
						isEdit={isEdit}
						key={question?.id ?? "new"}
						onCancel={() => onOpenChange(false)}
						onSave={onSave}
						question={question}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function SectionLabel({ children }: { children: string }) {
	return (
		<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
			{children}
		</p>
	);
}

function SurveyQuestionDialogForm({
	question,
	isEdit,
	exhibitorsEnabled,
	onSave,
	onCancel,
}: {
	question: SurveyQuestion | null;
	isEdit: boolean;
	exhibitorsEnabled: boolean;
	onSave: (values: SurveyQuestionFormValues) => Promise<void>;
	onCancel: () => void;
}) {
	const form = useSurveyQuestionForm(question, async (values) => {
		await onSave(values);
	});

	return (
		<Form
			className="grid gap-6 md:grid-cols-[1fr_minmax(260px,320px)]"
			onSubmit={() => {
				void form.handleSubmit();
			}}
		>
			<div className="space-y-4">
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
								onChange={field.handleChange}
								value={field.state.value}
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
												onChange={field.handleChange}
												options={field.state.value}
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

				{exhibitorsEnabled && (
					<div className="space-y-2">
						<SectionLabel>Audience</SectionLabel>
						<form.Field name="audience">
							{(field) => (
								<AudiencePicker
									onChange={field.handleChange}
									value={field.state.value}
								/>
							)}
						</form.Field>
					</div>
				)}

				<div className="space-y-3">
					<SectionLabel>Settings</SectionLabel>
					<form.AppField name="isRequired">
						{(field) => <field.SwitchField label="Required" />}
					</form.AppField>
					<form.AppField name="showInUsersList">
						{(field) => <field.SwitchField label="Show in users list" />}
					</form.AppField>
					<form.Subscribe selector={(s) => s.values.showInUsersList}>
						{(show) =>
							show ? (
								<form.AppField name="fieldName">
									{(field) => (
										<field.InputField
											description="Name shown as a column in the Users list and as the XLSX export header."
											label="Field name"
											placeholder="Field name..."
										/>
									)}
								</form.AppField>
							) : null
						}
					</form.Subscribe>
				</div>

				<DialogFooter className="md:col-span-2">
					<Button onClick={onCancel} type="button" variant="outline">
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
				<div className="bg-muted/20 rounded-lg border p-4">
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
		</Form>
	);
}

type PreviewValues = Pick<
	SurveyQuestionFormValues,
	"label" | "type" | "options" | "allowOther" | "isRequired"
>;

function QuestionPreview({ values }: { values: PreviewValues }) {
	const [answer, setAnswer] = useState("");

	return (
		<SurveyQuestionField
			onChange={setAnswer}
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
		/>
	);
}
