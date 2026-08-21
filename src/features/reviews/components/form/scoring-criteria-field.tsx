import { IconStar } from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";
import { SectionCard } from "@/shared/ui/section-card";
import type { ReviewFormApi } from "./hooks/use-review-form";

interface ScoringCriteriaFieldProps {
	form: ReviewFormApi;
	readOnly: boolean;
	scoringCriteria: { name: string; description: string }[];
}

export function ScoringCriteriaField({
	form,
	readOnly,
	scoringCriteria,
}: ScoringCriteriaFieldProps) {
	return (
		<SectionCard
			contentClassName="space-y-4"
			icon={IconStar}
			title="Evaluation Criteria"
		>
			<div className="border-border divide-border divide-y rounded-lg border">
				{scoringCriteria.map((criterion) => (
					<form.Field key={criterion.name} name={`scores.${criterion.name}`}>
						{(field) => {
							// SAFETY: this field is registered with a numeric score value.
							const currentScore = (field.state.value as number) ?? 0;
							return (
								<div
									className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
									data-testid="scoring-criterion"
								>
									<div className="min-w-0 flex-1">
										<p className="text-foreground text-sm font-medium">
											{criterion.name}
										</p>
										{criterion.description && (
											<p className="text-muted-foreground text-xs">
												{criterion.description}
											</p>
										)}
									</div>
									<div className="flex shrink-0 items-center gap-1">
										{[1, 2, 3, 4, 5].map((score) => (
											<button
												className={cn(
													"size-9 rounded-md border text-sm font-medium transition-all",
													currentScore === score
														? "border-primary bg-primary text-primary-foreground shadow-sm"
														: readOnly
															? "border-border text-muted-foreground opacity-60"
															: "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
												)}
												disabled={readOnly}
												key={score}
												// SAFETY: TanStack Form's generic field value is unresolved here; the field holds a number.
												onClick={() => field.handleChange(score as never)}
												type="button"
											>
												{score}
											</button>
										))}
									</div>
								</div>
							);
						}}
					</form.Field>
				))}
			</div>
			<p className="text-muted-foreground px-1 text-xs">
				1 = Poor &middot; 2 = Below Average &middot; 3 = Average &middot; 4 =
				Good &middot; 5 = Excellent
			</p>
		</SectionCard>
	);
}
