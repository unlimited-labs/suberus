import type { UserSubmissionDecision } from "@/features/submissions/api/submissions";
import type { EditorDecisionType } from "@/generated/prisma/enums";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { SectionCard } from "@/shared/ui/section-card";

interface EditorDecisionCardProps {
	decision: UserSubmissionDecision;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
}

const decisionColors = {
	ACCEPT: "default",
	CONDITIONALLY_ACCEPT: "default",
	REVISE_AND_RESUBMIT: "outline",
	REJECT: "destructive",
} satisfies Record<
	EditorDecisionType,
	"default" | "secondary" | "destructive" | "outline"
>;

const decisionLabels = {
	ACCEPT: "Accepted",
	CONDITIONALLY_ACCEPT: "Conditionally Accepted",
	REVISE_AND_RESUBMIT: "Revisions Required",
	REJECT: "Rejected",
} satisfies Record<EditorDecisionType, string>;

function DecisionContent({ decision }: { decision: UserSubmissionDecision }) {
	const { formatDateTime } = useDateFormat();
	return (
		<div className="space-y-4">
			<div>
				<p className="text-sm font-medium text-muted-foreground mb-2">
					Reasoning:
				</p>
				<p className="text-sm text-foreground leading-relaxed">
					{decision.reasoning}
				</p>
			</div>

			<div className="pt-3 border-t">
				<p className="text-sm font-medium text-muted-foreground mb-2">
					Letter to Author:
				</p>
				<div className="text-sm text-foreground whitespace-pre-line bg-background/50 p-4 rounded-lg border leading-relaxed max-h-64 overflow-y-auto">
					{decision.letterToAuthor}
				</div>
			</div>

			{decision.revisionsRequired && decision.revisionsRequired.length > 0 && (
				<div className="pt-2 border-t">
					<p className="text-sm font-medium text-muted-foreground mb-3">
						Required Revisions:
					</p>
					<ul className="space-y-2">
						{decision.revisionsRequired.map((revision, index) => (
							<li
								key={index}
								className="text-sm flex items-start gap-2 bg-muted/50 p-3 rounded-lg"
							>
								<span className="text-muted-foreground font-medium">
									{index + 1}.
								</span>
								<span className="text-foreground">{revision}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{decision.conditions && decision.conditions.length > 0 && (
				<div className="pt-2 border-t">
					<p className="text-sm font-medium text-muted-foreground mb-3">
						Acceptance Conditions:
					</p>
					<ul className="space-y-2">
						{decision.conditions.map((condition, index) => (
							<li
								key={index}
								className="text-sm flex items-start gap-2 bg-muted/50 p-3 rounded-lg"
							>
								<span className="text-muted-foreground font-medium">
									{index + 1}.
								</span>
								<span className="text-foreground">{condition}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			<div className="text-xs text-muted-foreground pt-2 border-t">
				Decision date: {formatDateTime(decision.createdAt)}
			</div>
		</div>
	);
}

export function EditorDecisionCard({
	decision,
	collapsible = false,
	defaultCollapsed = true,
}: EditorDecisionCardProps) {
	const decisionBadge = (
		<Badge variant={decisionColors[decision.decision]}>
			{decisionLabels[decision.decision]}
		</Badge>
	);

	if (collapsible) {
		return (
			<div id="decision-section">
				<SectionCard
					variant="elevated"
					collapsible
					defaultOpen={!defaultCollapsed}
					title="Editorial Decision"
					action={decisionBadge}
				>
					<DecisionContent decision={decision} />
				</SectionCard>
			</div>
		);
	}

	return (
		<div id="decision-section">
			<SectionCard
				variant="elevated"
				title="Editorial Decision"
				action={decisionBadge}
			>
				<DecisionContent decision={decision} />
			</SectionCard>
		</div>
	);
}
