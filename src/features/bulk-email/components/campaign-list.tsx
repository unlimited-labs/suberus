import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { bulkEmailCampaignsQueryOptions } from "@/features/bulk-email/api/bulk-email";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

function statusVariant(
	status: string,
): "default" | "secondary" | "destructive" {
	if (status === "SENT") return "default";
	if (status === "FAILED") return "destructive";
	return "secondary";
}

export function CampaignList() {
	const { data: campaigns } = useSuspenseQuery(
		bulkEmailCampaignsQueryOptions(),
	);
	const { formatDateTime } = useDateFormat();

	return (
		<div className="mx-auto max-w-5xl space-y-4 p-4">
			<h1 className="text-2xl font-semibold">Email campaigns</h1>

			{campaigns.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No campaigns yet. Select users in the Users table and choose “Send
					email”.
				</p>
			) : (
				<Card>
					<CardContent className="divide-y p-0" data-testid="campaign-list">
						{campaigns.map((c) => (
							<Link
								key={c.id}
								to="/admin/bulk-email/$id"
								params={{ id: c.id }}
								className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/40"
							>
								<div className="min-w-0">
									<p className="truncate font-medium">
										{c.subject || "(no subject)"}
									</p>
									<p className="text-xs text-muted-foreground">
										{formatDateTime(c.createdAt)} · {c.format}
									</p>
								</div>
								<div className="flex shrink-0 items-center gap-3 text-sm">
									<span className="text-muted-foreground">
										{c.sentCount}/{c.totalRecipients} sent
										{c.failedCount > 0 ? ` · ${c.failedCount} failed` : ""}
									</span>
									<Badge variant={statusVariant(c.status)}>{c.status}</Badge>
								</div>
							</Link>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
