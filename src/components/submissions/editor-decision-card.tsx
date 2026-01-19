import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type {
	MockEditorDecision,
	SubmissionStatus,
} from "@/lib/mock-data/submissions";

interface EditorDecisionCardProps {
	decision: MockEditorDecision;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
}

const statusColors: Record<
	SubmissionStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	DRAFT: "outline",
	SUBMITTED: "default",
	UNDER_REVIEW: "secondary",
	REVIEWS_COMPLETE: "secondary",
	AWAITING_DECISION: "secondary",
	REVISE_REQUIRED: "outline",
	RESUBMITTED: "default",
	ACCEPTED: "default",
	CONDITIONALLY_ACCEPTED: "default",
	REJECTED: "destructive",
	WITHDRAWN: "outline",
};

const statusLabels: Record<SubmissionStatus, string> = {
	DRAFT: "Szkic",
	SUBMITTED: "Zgłoszono",
	UNDER_REVIEW: "W recenzji",
	REVIEWS_COMPLETE: "Recenzje zakończone",
	AWAITING_DECISION: "Oczekuje na decyzję",
	REVISE_REQUIRED: "Wymagane poprawki",
	RESUBMITTED: "Ponownie zgłoszono",
	ACCEPTED: "Zaakceptowano",
	CONDITIONALLY_ACCEPTED: "Warunkowo zaakceptowano",
	REJECTED: "Odrzucono",
	WITHDRAWN: "Wycofano",
};

function DecisionContent({ decision }: { decision: MockEditorDecision }) {
	return (
		<div className="space-y-4">
			{/* Reasoning */}
			<div>
				<p className="text-sm font-medium text-muted-foreground mb-2">
					Uzasadnienie:
				</p>
				<p className="text-sm text-foreground leading-relaxed">
					{decision.reasoning}
				</p>
			</div>

			{/* Letter to Author */}
			<div className="pt-3 border-t">
				<p className="text-sm font-medium text-muted-foreground mb-2">
					List do autora:
				</p>
				<div className="text-sm text-foreground whitespace-pre-line bg-background/50 p-4 rounded-lg border leading-relaxed max-h-64 overflow-y-auto">
					{decision.letterToAuthor}
				</div>
			</div>

			{/* Revisions Required */}
			{decision.revisionsRequired && decision.revisionsRequired.length > 0 && (
				<div className="pt-2 border-t">
					<p className="text-sm font-medium text-muted-foreground mb-3">
						Wymagane poprawki:
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
						Warunki akceptacji:
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
				Data decyzji:{" "}
				{decision.createdAt.toLocaleDateString("pl-PL", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				})}
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
				className="rounded-2xl bg-card shadow-2xl border"
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
									Decyzja redakcji
								</h2>
								<Badge variant={statusColors[decision.decision]}>
									{statusLabels[decision.decision]}
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
						Decyzja redakcji
					</h2>
					<Badge variant={statusColors[decision.decision]}>
						{statusLabels[decision.decision]}
					</Badge>
				</div>
				<DecisionContent decision={decision} />
			</div>
		</div>
	);
}
