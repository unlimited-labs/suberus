import type { SubmissionTypeKey } from "@/features/settings/types";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionTypeFormApi } from "./use-submission-type-config";

interface TypeGeneralSectionProps {
	typeKey: SubmissionTypeKey;
	form: SubmissionTypeFormApi;
	submissionAttempts: number;
}

export function TypeGeneralSection({
	typeKey,
	form,
	submissionAttempts,
}: TypeGeneralSectionProps) {
	return (
		<>
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Active</Label>
					<p className="text-muted-foreground/70 text-xs italic">
						Type available for selection when submitting
					</p>
				</div>
				<form.Field name="isActive">
					{(field) => (
						<Switch
							checked={field.state.value}
							onCheckedChange={(checked) =>
								field.handleChange(checked === true)
							}
						/>
					)}
				</form.Field>
			</div>

			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Include in program planner</Label>
					<p className="text-muted-foreground/70 text-xs italic">
						Accepted submissions of this type appear in the program planner
					</p>
				</div>
				<form.Field name="includeInPlanner">
					{(field) => (
						<Switch
							checked={field.state.value}
							data-testid="settings-include-in-planner"
							onCheckedChange={(checked) =>
								field.handleChange(checked === true)
							}
						/>
					)}
				</form.Field>
			</div>

			{typeKey !== "SUBMISSION_TYPE_EXHIBITOR" && (
				<form.Field name="maxSubmissionsPerUser">
					{(field) => {
						const hasError = isFieldErrorVisible(
							field.state.meta,
							submissionAttempts,
						);
						return (
							<div className="space-y-2">
								<Label>Max submissions per user</Label>
								<Input
									aria-invalid={hasError}
									data-testid="settings-max-submissions-per-user"
									max={1000}
									min={0}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									type="number"
									value={field.state.value}
								/>
								<FieldError
									errors={hasError ? field.state.meta.errors : undefined}
								/>
								<p className="text-muted-foreground/70 text-xs italic">
									0 = unlimited. Counts only submissions a user owns
									(co-authorship doesn't count); drafts, withdrawn and rejected
									don't count.
								</p>
							</div>
						);
					}}
				</form.Field>
			)}
		</>
	);
}
