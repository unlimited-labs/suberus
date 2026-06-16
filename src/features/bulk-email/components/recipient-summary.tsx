import { Badge } from "@/shared/ui/badge";

export interface RecipientRow {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	status: string;
	error: string | null;
}

interface RecipientSummaryProps {
	/** Capped preview list (see RECIPIENT_PREVIEW_LIMIT), not necessarily all. */
	recipients: RecipientRow[];
	/** True recipient count (may exceed `recipients.length`). */
	totalRecipients: number;
	sentCount: number;
	failedCount: number;
}

// Only SENT/FAILED get a badge — PENDING (the pre-send state of every
// recipient) would just be confusing noise on a draft.
function statusVariant(status: string): "default" | "destructive" | null {
	if (status === "SENT") return "default";
	if (status === "FAILED") return "destructive";
	return null;
}

export function RecipientSummary({
	recipients,
	totalRecipients,
	sentCount,
	failedCount,
}: RecipientSummaryProps) {
	const hiddenCount = totalRecipients - recipients.length;
	const renderBadge = (status: string) => {
		const variant = statusVariant(status);
		return variant ? <Badge variant={variant}>{status}</Badge> : null;
	};

	return (
		<div className="space-y-2" data-testid="recipient-summary">
			<div className="flex items-center gap-3 text-sm">
				<span className="font-medium" data-testid="recipient-count">
					{totalRecipients} recipients
				</span>
				{sentCount > 0 ? (
					<span className="text-muted-foreground">{sentCount} sent</span>
				) : null}
				{failedCount > 0 ? (
					<span className="text-destructive">{failedCount} failed</span>
				) : null}
			</div>
			<ul className="max-h-48 space-y-1 overflow-auto rounded-md border border-border p-2 text-sm">
				{recipients.map((r) => (
					<li key={r.id} className="flex items-center justify-between gap-2">
						<span className="truncate">
							{[r.firstName, r.lastName].filter(Boolean).join(" ") || r.email}
							<span className="ml-2 text-xs text-muted-foreground">
								{r.email}
							</span>
						</span>
						{renderBadge(r.status)}
					</li>
				))}
				{hiddenCount > 0 ? (
					<li className="pt-1 text-center text-xs text-muted-foreground">
						+ {hiddenCount} more not shown
					</li>
				) : null}
			</ul>
		</div>
	);
}
