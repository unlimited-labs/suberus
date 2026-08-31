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
				<p className="text-muted-foreground mb-2 text-sm font-medium">
					Reasoning:
				</p>
				<p className="text-foreground text-sm leading-relaxed">
					{decision.reasoning}
				</p>
			</div>

			<div className="border-t pt-3">
				<p className="text-muted-foreground mb-2 text-sm font-medium">
					Letter to Author:
				</p>
				<div className="text-foreground bg-background/50 fade-y max-h-64 overflow-y-auto rounded-lg border p-4 text-sm leading-relaxed whitespace-pre-line">
					{decision.letterToAuthor}
				</div>
			</div>

			{decision.revisionsRequired && decision.revisionsRequired.length > 0 && (
				<div className="border-t pt-2">
					<p className="text-muted-foreground mb-3 text-sm font-medium">
						Required Revisions:
					</p>
					<ul className="space-y-2">
						{decision.revisionsRequired.map((revision, index) => (
							<li
								className="bg-muted/50 flex items-start gap-2 rounded-lg p-3 text-sm"
								key={index}
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
				<div className="border-t pt-2">
					<p className="text-muted-foreground mb-3 text-sm font-medium">
						Acceptance Conditions:
					</p>
					<ul className="space-y-2">
						{decision.conditions.map((condition, index) => (
							<li
								className="bg-muted/50 flex items-start gap-2 rounded-lg p-3 text-sm"
								key={index}
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

			<div className="text-muted-foreground border-t pt-2 text-xs">
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
					action={decisionBadge}
					collapsible
					defaultOpen={!defaultCollapsed}
					title="Editorial Decision"
					variant="elevated"
				>
					<DecisionContent decision={decision} />
				</SectionCard>
			</div>
		);
	}

	return (
		<div id="decision-section">
			<SectionCard
				action={decisionBadge}
				title="Editorial Decision"
				variant="elevated"
			>
				<DecisionContent decision={decision} />
			</SectionCard>
		</div>
	);
}
