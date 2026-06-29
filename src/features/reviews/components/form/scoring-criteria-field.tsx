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
			title="Evaluation Criteria"
			icon={IconStar}
			contentClassName="space-y-4"
		>
			<div className="rounded-lg border border-border divide-y divide-border">
				{scoringCriteria.map((criterion) => (
					<form.Field key={criterion.name} name={`scores.${criterion.name}`}>
						{(field) => {
							const currentScore = (field.state.value as number) ?? 0;
							return (
								<div
									className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3"
									data-testid="scoring-criterion"
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-foreground">
											{criterion.name}
										</p>
										{criterion.description && (
											<p className="text-xs text-muted-foreground">
												{criterion.description}
											</p>
										)}
									</div>
									<div className="flex items-center gap-1 shrink-0">
										{[1, 2, 3, 4, 5].map((score) => (
											<button
												key={score}
												type="button"
												disabled={readOnly}
												onClick={() => field.handleChange(score as never)}
												className={cn(
													"size-9 rounded-md border text-sm font-medium transition-all",
													currentScore === score
														? "border-primary bg-primary text-primary-foreground shadow-sm"
														: readOnly
															? "border-border text-muted-foreground opacity-60"
															: "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
												)}
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
			<p className="text-xs text-muted-foreground px-1">
				1 = Poor &middot; 2 = Below Average &middot; 3 = Average &middot; 4 =
				Good &middot; 5 = Excellent
			</p>
		</SectionCard>
	);
}
