import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { EditorDecisionType } from "@/generated/prisma/enums";
import { useDateFormat } from "@/hooks/use-date-format";
import type { UserSubmissionDecision } from "@/server-fns/submissions";

interface EditorDecisionCardProps {
	decision: UserSubmissionDecision;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
}

const decisionColors: Record<
	EditorDecisionType,
	"default" | "secondary" | "destructive" | "outline"
> = {
	ACCEPT: "default",
	CONDITIONALLY_ACCEPT: "default",
	REVISE_AND_RESUBMIT: "outline",
	REJECT: "destructive",
};

const decisionLabels: Record<EditorDecisionType, string> = {
	ACCEPT: "Accepted",
	CONDITIONALLY_ACCEPT: "Conditionally Accepted",
	REVISE_AND_RESUBMIT: "Revisions Required",
	REJECT: "Rejected",
};

function DecisionContent({ decision }: { decision: UserSubmissionDecision }) {
	const { formatDateTime } = useDateFormat();
	return (
		<div className="space-y-4">
			{/* Reasoning */}
			<div>
				<p className="text-sm font-medium text-muted-foreground mb-2">
					Reasoning:
				</p>
				<p className="text-sm text-foreground leading-relaxed">
					{decision.reasoning}
				</p>
			</div>

			{/* Letter to Author */}
			<div className="pt-3 border-t">
				<p className="text-sm font-medium text-muted-foreground mb-2">
					Letter to Author:
				</p>
				<div className="text-sm text-foreground whitespace-pre-line bg-background/50 p-4 rounded-lg border leading-relaxed max-h-64 overflow-y-auto">
					{decision.letterToAuthor}
				</div>
			</div>

			{/* Revisions Required */}
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

			{/* Conditions */}
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

			{/* Decision Date */}
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
	if (collapsible) {
		return (
			<div
				id="decision-section"
				className="rounded-2xl bg-card shadow-2xl border border-border/50"
			>
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultCollapsed ? undefined : "decision"}
				>
					<AccordionItem value="decision" className="border-0">
						<AccordionTrigger className="px-8 py-6 hover:no-underline">
							<div className="flex items-center gap-3 flex-wrap">
								<h2 className="text-xl font-semibold text-foreground">
									Editorial Decision
								</h2>
								<Badge variant={decisionColors[decision.decision]}>
									{decisionLabels[decision.decision]}
								</Badge>
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-8 pb-8">
							<DecisionContent decision={decision} />
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		);
	}

	return (
		<div
			id="decision-section"
			className="rounded-2xl bg-card shadow-2xl border p-8"
		>
			<div className="space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between flex-wrap gap-3">
					<h2 className="text-xl font-semibold text-foreground">
						Editorial Decision
					</h2>
					<Badge variant={decisionColors[decision.decision]}>
						{decisionLabels[decision.decision]}
					</Badge>
				</div>
				<DecisionContent decision={decision} />
			</div>
		</div>
	);
}
