import { IconMail } from "@tabler/icons-react";
import { useState } from "react";
import type { getBulkEmailCampaign } from "@/features/bulk-email/api/bulk-email";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { SentEmailDialog } from "./sent-email-dialog";

type Campaign = Awaited<ReturnType<typeof getBulkEmailCampaign>>;
type RecipientRow = Campaign["recipients"][number];

interface RecipientSummaryProps {
	/** Capped preview list (see RECIPIENT_PREVIEW_LIMIT), not necessarily all. */
	recipients: RecipientRow[];
	/** True recipient count (may exceed `recipients.length`). */
	totalRecipients: number;
	sentCount: number;
	failedCount: number;
}

function initials(r: RecipientRow): string {
	const fromName = `${r.firstName?.[0] ?? ""}${r.lastName?.[0] ?? ""}`;
	return (fromName || r.email[0] || "?").toUpperCase();
}

function displayName(r: RecipientRow): string {
	return [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email;
}

function DeliveryBadge({
	row,
	email,
	onPreview,
}: {
	row: RecipientRow;
	email: string;
	onPreview: () => void;
}) {
	switch (row.delivery.kind) {
		case "PENDING":
			return null;
		case "FAILED":
			return (
				<Badge
					className="shrink-0 text-[10px]"
					title={row.delivery.error}
					variant="destructive"
				>
					FAILED
				</Badge>
			);
		case "SENT":
			// Only a SENT row can carry an archive, so the preview cannot be offered
			// on a failed one — that combination no longer type-checks.
			return row.delivery.hasArchive ? (
				<Badge asChild className="shrink-0 text-[10px]" variant="default">
					<button
						aria-label={`Preview the email sent to ${email}`}
						data-testid="recipient-preview-trigger"
						onClick={onPreview}
						type="button"
					>
						<span className="group-hover/badge:hidden">SENT</span>
						<IconMail className="hidden group-hover/badge:block" />
					</button>
				</Badge>
			) : (
				<Badge className="shrink-0 text-[10px]" variant="default">
					SENT
				</Badge>
			);
		default: {
			const _exhaustive: never = row.delivery;
			throw new Error(`Unsupported delivery: ${JSON.stringify(_exhaustive)}`);
		}
	}
}

export function RecipientSummary({
	recipients,
	totalRecipients,
	sentCount,
	failedCount,
}: RecipientSummaryProps) {
	const hiddenCount = totalRecipients - recipients.length;
	const [previewId, setPreviewId] = useState<string | null>(null);

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
				{recipients.map((r) => (
					<li className="flex items-center gap-2.5 rounded-md py-1" key={r.id}>
						<Avatar size="sm">
							<AvatarFallback className="text-[10px] font-medium">
								{initials(r)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1 leading-tight">
							<p className="truncate text-sm">{displayName(r)}</p>
							<p className="text-muted-foreground truncate text-xs">
								{r.email}
							</p>
						</div>
						<DeliveryBadge
							email={r.email}
							onPreview={() => setPreviewId(r.id)}
							row={r}
						/>
					</li>
				))}
				{hiddenCount > 0 ? (
					<li className="text-muted-foreground px-1 pt-1.5 text-xs">
						+ {hiddenCount} more not shown
					</li>
				) : null}
			</ul>

			<SentEmailDialog
				onClose={() => setPreviewId(null)}
				recipientId={previewId}
			/>
		</div>
	);
}
