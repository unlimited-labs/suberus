import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SurveyQuestionFormValues } from "@/lib/validations/survey";
import {
	isSelectType,
	OptionsEditor,
	TypeSelect,
} from "./survey-question-fields";
import { useSurveyQuestionForm } from "./use-survey-question-form";

interface SurveyQuestionAddFormProps {
	onCreate: (values: SurveyQuestionFormValues) => Promise<void>;
}

/**
 * Compact inline "quick add" form. Bound to TanStack Form via
 * `useSurveyQuestionForm`, but with raw controls (its own `add-*` ids) instead
 * of the composable fields: the edit dialog — which IS the composable form —
 * stays mounted alongside this one, and sharing `field.name` ids across both
 * would duplicate DOM ids and break `<label for>` association.
 */
export function SurveyQuestionAddForm({
	onCreate,
}: SurveyQuestionAddFormProps) {
	const form = useSurveyQuestionForm(null, async (values, formApi) => {
		await onCreate(values);
		formApi.reset();
	});

	return (
		<form
			data-testid="add-question-section"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-2 rounded-lg border border-dashed border-border bg-muted/10 p-4"
		>
			<p className="text-sm font-medium text-muted-foreground">New Question</p>

			<form.Field name="label">
				{(field) => (
					<div className="space-y-1">
						<Input
							placeholder="New question label..."
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(e) => field.handleChange(e.target.value)}
							className="h-9"
						/>
						<form.Subscribe selector={(s) => s.submissionAttempts}>
							{(attempts) => (
								<FieldError
									errors={attempts > 0 ? field.state.meta.errors : undefined}
								/>
							)}
						</form.Subscribe>
					</div>
				)}
			</form.Field>

			<div className="flex flex-wrap items-center gap-2">
				<form.Field name="type">
					{(field) => (
						<TypeSelect
							value={field.state.value}
							onChange={field.handleChange}
							className="h-8 w-[160px]"
						/>
					)}
				</form.Field>
				<form.Field name="isRequired">
					{(field) => (
						<div className="flex items-center gap-1.5">
							<Switch
								id="add-required"
								checked={field.state.value}
								onCheckedChange={(c) => field.handleChange(c === true)}
							/>
							<Label htmlFor="add-required" className="text-xs">
								Required
							</Label>
						</div>
					)}
				</form.Field>
				<form.AppForm>
					<form.SubmitButton label="Add" submittingLabel="Adding..." />
				</form.AppForm>
			</div>

			<form.Subscribe selector={(s) => s.values.type}>
				{(type) =>
					isSelectType(type) ? (
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
					) : null
				}
			</form.Subscribe>

			<div className="space-y-2 rounded-md border border-border/50 bg-background p-3">
				<form.Field name="showInUsersList">
					{(field) => (
						<div className="flex items-center gap-2">
							<Switch
								id="add-show-in-list"
								checked={field.state.value}
								onCheckedChange={(c) => field.handleChange(c === true)}
							/>
							<Label htmlFor="add-show-in-list" className="text-sm">
								Show in users list
							</Label>
						</div>
					)}
				</form.Field>
				<form.Subscribe selector={(s) => s.values.showInUsersList}>
					{(show) =>
						show ? (
							<form.Field name="fieldName">
								{(field) => (
									<div className="space-y-1">
										<Input
											aria-label="Field name"
											placeholder="Field name..."
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											className="h-8 text-sm"
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
										<p className="text-xs text-muted-foreground">
											Name shown as a column in the Users list and as the XLSX
											export header.
										</p>
									</div>
								)}
							</form.Field>
						) : null
					}
				</form.Subscribe>
			</div>
		</form>
	);
}
