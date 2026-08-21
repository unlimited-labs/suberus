import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
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

function initials(r: RecipientRow): string {
	const fromName = `${r.firstName?.[0] ?? ""}${r.lastName?.[0] ?? ""}`;
	return (fromName || r.email[0] || "?").toUpperCase();
}

function displayName(r: RecipientRow): string {
	return [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email;
}

export function RecipientSummary({
	recipients,
	totalRecipients,
	sentCount,
	failedCount,
}: RecipientSummaryProps) {
	const hiddenCount = totalRecipients - recipients.length;

	return (
		<div className="space-y-3 text-sm" data-testid="recipient-summary">
			<p>
				<span
					className="font-medium tabular-nums"
					data-testid="recipient-count"
				>
					{totalRecipients}
				</span>{" "}
				<span className="text-muted-foreground">
					{totalRecipients === 1 ? "recipient" : "recipients"}
				</span>
				{sentCount > 0 ? (
					<span className="text-muted-foreground"> · {sentCount} sent</span>
				) : null}
				{failedCount > 0 ? (
					<span className="text-destructive"> · {failedCount} failed</span>
				) : null}
			</p>

			<ul className="-mx-1 max-h-64 space-y-0.5 overflow-auto px-1">
				{recipients.map((r) => {
					const variant = statusVariant(r.status);
					return (
						<li
							className="flex items-center gap-2.5 rounded-md py-1"
							key={r.id}
						>
							<Avatar size="sm">
								<AvatarFallback className="text-[10px] font-medium">
									{initials(r)}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1 leading-tight">
								<p className="truncate text-sm">{displayName(r)}</p>
								<p className="truncate text-xs text-muted-foreground">
									{r.email}
								</p>
							</div>
							{variant ? (
								<Badge className="shrink-0 text-[10px]" variant={variant}>
									{r.status}
								</Badge>
							) : null}
						</li>
					);
				})}
				{hiddenCount > 0 ? (
					<li className="px-1 pt-1.5 text-xs text-muted-foreground">
						+ {hiddenCount} more not shown
					</li>
				) : null}
			</ul>
		</div>
	);
}
