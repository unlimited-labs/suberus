import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionTypeFormApi } from "./use-submission-type-config";

const reviewModeLabels = {
	OPEN: "Open",
	SINGLE_BLIND: "Single-blind",
	DOUBLE_BLIND: "Double-blind",
} as const;

// SAFETY: Object.keys over this const map returns exactly its declared keys.
const REVIEW_MODES = Object.keys(
	reviewModeLabels,
) as (keyof typeof reviewModeLabels)[];

interface TypeReviewSectionProps {
	form: SubmissionTypeFormApi;
	submissionAttempts: number;
}

export function TypeReviewSection({
	form,
	submissionAttempts,
}: TypeReviewSectionProps) {
	return (
		<>
			<form.Field name="requiredReviewers">
				{(field) => {
					const hasError = isFieldErrorVisible(
						field.state.meta,
						submissionAttempts,
					);
					return (
						<div className="space-y-2">
							<Label htmlFor="required-reviewers">Required reviewers</Label>
							<Input
								aria-invalid={hasError}
								id="required-reviewers"
								max={10}
								min={1}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								type="number"
								value={field.state.value}
							/>
							<FieldError
								errors={hasError ? field.state.meta.errors : undefined}
							/>
						</div>
					);
				}}
			</form.Field>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label>Review mode</Label>
					<form.Field name="reviewMode">
						{(field) => (
							<Select
								items={Object.entries(reviewModeLabels).map(
									([value, label]) => ({
										value,
										label,
									}),
								)}
								onValueChange={(value) => {
									const found = REVIEW_MODES.find((m) => m === value);
									if (found) field.handleChange(found);
								}}
								value={field.state.value}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(reviewModeLabels).map(([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</form.Field>
				</div>
				<form.Field name="reviewDeadlineDays">
					{(field) => {
						const hasError = isFieldErrorVisible(
							field.state.meta,
							submissionAttempts,
						);
						return (
							<div className="space-y-2">
								<Label>Review deadline (days)</Label>
								<Input
									aria-invalid={hasError}
									max={90}
									min={1}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									type="number"
									value={field.state.value}
								/>
								<FieldError
									errors={hasError ? field.state.meta.errors : undefined}
								/>
							</div>
						);
					}}
				</form.Field>
			</div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label>Requires editor decision</Label>
						<p className="text-muted-foreground/70 text-xs italic">
							Editor makes the final accept/reject decision. When off, the
							reviewer's recommendation is applied automatically.
						</p>
					</div>
					<form.Field name="requiresEditorDecision">
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
			</div>
		</>
	);
}
