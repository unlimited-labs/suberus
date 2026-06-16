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
	recipients: RecipientRow[];
	sentCount: number;
	failedCount: number;
}

function statusVariant(
	status: string,
): "default" | "secondary" | "destructive" {
	if (status === "SENT") return "default";
	if (status === "FAILED") return "destructive";
	return "secondary";
}

export function RecipientSummary({
	recipients,
	sentCount,
	failedCount,
}: RecipientSummaryProps) {
	return (
		<div className="space-y-2" data-testid="recipient-summary">
			<div className="flex items-center gap-3 text-sm">
				<span className="font-medium" data-testid="recipient-count">
					{recipients.length} recipients
				</span>
				{sentCount > 0 ? (
					<span className="text-muted-foreground">{sentCount} sent</span>
				) : null}
				{failedCount > 0 ? (
					<span className="text-destructive">{failedCount} failed</span>
				) : null}
			</div>
			<ul className="max-h-48 space-y-1 overflow-auto rounded-md border p-2 text-sm">
				{recipients.map((r) => (
					<li key={r.id} className="flex items-center justify-between gap-2">
						<span className="truncate">
							{[r.firstName, r.lastName].filter(Boolean).join(" ") || r.email}
							<span className="ml-2 text-xs text-muted-foreground">
								{r.email}
							</span>
						</span>
						<Badge variant={statusVariant(r.status)}>{r.status}</Badge>
					</li>
				))}
			</ul>
		</div>
	);
}
