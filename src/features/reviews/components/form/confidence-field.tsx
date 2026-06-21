import { IconCircle } from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";
import { Field, FieldError } from "@/shared/ui/field";
import { SectionCard } from "@/shared/ui/section-card";
import type { ReviewFormApi } from "./hooks/use-review-form";
import { confidenceLevels } from "./review-form-options";

interface ConfidenceFieldProps {
	form: ReviewFormApi;
	readOnly: boolean;
}

export function ConfidenceField({ form, readOnly }: ConfidenceFieldProps) {
	return (
		<SectionCard title="Confidence Level" icon={IconCircle}>
			<form.Field name="confidenceLevel">
				{(field) => {
					const hasError =
						field.state.meta.isBlurred && field.state.meta.errors.length > 0;
					return (
						<Field data-invalid={hasError}>
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									{confidenceLevels.map((level) => (
										<button
											key={level.value}
											type="button"
											disabled={readOnly}
											onClick={() => field.handleChange(level.value)}
											className={cn(
												"flex-1 h-12 rounded-lg border-2 transition-all font-medium text-sm",
												field.state.value === level.value
													? "border-primary bg-primary text-primary-foreground shadow-sm"
													: readOnly
														? "border-border text-muted-foreground opacity-60"
														: "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
											)}
										>
											{level.value}
										</button>
									))}
								</div>
								<div className="flex justify-between text-xs text-muted-foreground px-1">
									<span>Very Low</span>
									<span>Very High</span>
								</div>
								{field.state.value > 0 && (
									<p className="text-sm text-foreground mt-2">
										{confidenceLevels[field.state.value - 1].label}:{" "}
										<span className="text-muted-foreground">
											{confidenceLevels[field.state.value - 1].description}
										</span>
									</p>
								)}
							</div>
							<FieldError
								errors={hasError ? field.state.meta.errors : undefined}
							/>
						</Field>
					);
				}}
			</form.Field>
		</SectionCard>
	);
}
