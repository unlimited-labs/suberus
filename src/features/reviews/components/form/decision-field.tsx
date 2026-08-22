import { IconScale } from "@tabler/icons-react";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { cn } from "@/shared/lib/utils";
import { Field, FieldError } from "@/shared/ui/field";
import { SectionCard } from "@/shared/ui/section-card";
import type { ReviewFormApi } from "./hooks/use-review-form";
import { decisionOptions } from "./review-form-options";

interface DecisionFieldProps {
	form: ReviewFormApi;
	readOnly: boolean;
}

export function DecisionField({ form, readOnly }: DecisionFieldProps) {
	return (
		<SectionCard icon={IconScale} title="Decision">
			<form.Field name="decision">
				{(field) => {
					const hasError = isFieldErrorVisible(field.state.meta);
					return (
						<Field data-invalid={hasError}>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{decisionOptions.map((option) => {
									const Icon = option.icon;
									const isSelected = field.state.value === option.value;
									return (
										<button
											className={cn(
												"flex flex-col gap-2 p-4 rounded-lg border-2 transition-all text-left",
												readOnly && "cursor-default",
												isSelected
													? "border-primary bg-primary/5"
													: readOnly
														? "border-border opacity-60"
														: "border-border hover:border-primary/50",
											)}
											disabled={readOnly}
											key={option.value}
											onClick={() => field.handleChange(option.value)}
											type="button"
										>
											<div className="flex items-center gap-2">
												<div
													className={cn(
														"flex-shrink-0 p-1.5 rounded-md",
														isSelected ? "bg-primary/10" : "bg-muted",
													)}
												>
													<Icon
														className={cn(
															"size-4",
															isSelected
																? "text-primary"
																: "text-muted-foreground",
														)}
													/>
												</div>
												<span
													className={cn(
														"font-medium text-sm",
														isSelected
															? "text-foreground"
															: "text-muted-foreground",
													)}
												>
													{option.label}
												</span>
											</div>
											<p className="text-muted-foreground pl-8 text-xs">
												{option.description}
											</p>
										</button>
									);
								})}
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
