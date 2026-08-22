import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { SubmissionTypeFormApi } from "./use-submission-type-config";

interface ScoringCriteriaSectionProps {
	form: SubmissionTypeFormApi;
}

export function ScoringCriteriaSection({ form }: ScoringCriteriaSectionProps) {
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	return (
		<div className="space-y-3 pl-0 sm:pl-4">
			<Label>Scoring criteria</Label>
			<form.Field mode="array" name="scoringCriteria">
				{(arrayField) => (
					<>
						<div className="space-y-2">
							{arrayField.state.value.map((_, index) => (
								<div className="flex items-start gap-2" key={index}>
									<div className="grid flex-1 gap-2 sm:grid-cols-2">
										<form.Field name={`scoringCriteria[${index}].name`}>
											{(field) => (
												<Input
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="Criterion name"
													value={field.state.value}
												/>
											)}
										</form.Field>
										<form.Field name={`scoringCriteria[${index}].description`}>
											{(field) => (
												<Input
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="Description (optional)"
													value={field.state.value}
												/>
											)}
										</form.Field>
									</div>
									<Button
										className="text-destructive hover:bg-destructive/10 shrink-0"
										onClick={() => arrayField.removeValue(index)}
										size="icon"
										type="button"
										variant="ghost"
									>
										<IconTrash className="size-4" />
									</Button>
								</div>
							))}
						</div>
						<FieldError
							errors={
								isFieldErrorVisible(arrayField.state.meta, submissionAttempts)
									? arrayField.state.meta.errors
									: undefined
							}
						/>
						<Button
							className="gap-1"
							onClick={() =>
								arrayField.pushValue({ name: "", description: "" })
							}
							size="sm"
							type="button"
							variant="outline"
						>
							<IconPlus className="size-4" />
							Add criterion
						</Button>
					</>
				)}
			</form.Field>
		</div>
	);
}
