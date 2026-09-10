import { IconMail, IconTableImport } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	bulkEmailCampaignsQueryOptions,
	createBulkEmailDraftFromSheet,
	matchBulkEmailSheet,
	parseBulkEmailSheet,
} from "@/features/bulk-email/api/bulk-email";
import { sheetCampaignCreateInput } from "@/features/bulk-email/validations";
import type { EmailCampaignStatus } from "@/generated/prisma/enums";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SheetWizardDialog } from "@/shared/components/sheet-wizard/sheet-wizard-dialog";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";

function statusVariant(
	status: EmailCampaignStatus,
): "default" | "secondary" | "destructive" {
	if (status === "SENT") return "default";
	if (status === "FAILED") return "destructive";
	return "secondary";
}

export function CampaignList() {
	const { data: campaigns } = useSuspenseQuery(
		bulkEmailCampaignsQueryOptions(),
	);
	const { formatDateTime, formatDateTimeWithZone } = useDateFormat();
	const [importOpen, setImportOpen] = useState(false);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconMail} title="Email campaigns">
				<Button
					data-testid="import-sheet-btn"
					onClick={() => setImportOpen(true)}
				>
					<IconTableImport className="size-4" />
					Import spreadsheet
				</Button>
			</PageHeader>
			<SheetWizardDialog
				createErrorMessage="Could not create the campaign"
				createFromSheet={async (data) => {
					const { campaignId } = await createBulkEmailDraftFromSheet({ data });
					return campaignId;
				}}
				createLabel="Create campaign"
				createSchema={sheetCampaignCreateInput}
				matchSheet={(input) => matchBulkEmailSheet({ data: input })}
				onCreated={async (id) => {
					await queryClient.invalidateQueries({
						queryKey: bulkEmailCampaignsQueryOptions().queryKey,
					});
					setImportOpen(false);
					await navigate({ to: "/admin/bulk-email/$id", params: { id } });
				}}
				onOpenChange={setImportOpen}
				open={importOpen}
				parseSheet={(body) => parseBulkEmailSheet({ data: body })}
			/>
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl">
					{campaigns.length === 0 ? (
						<EmptyState
							description="Start a campaign from the Users table, or import a spreadsheet."
							icon={IconMail}
							title="No campaigns yet"
						/>
					) : (
						<Card>
							<CardContent className="divide-y p-0" data-testid="campaign-list">
								{campaigns.map((c) => (
									<Link
										className="hover:bg-muted/40 flex items-center justify-between gap-4 px-4 py-3"
										key={c.id}
										params={{ id: c.id }}
										to="/admin/bulk-email/$id"
									>
										<div className="min-w-0">
											<p className="truncate font-medium">
												{c.subject || "(no subject)"}
											</p>
											<p className="text-muted-foreground text-xs">
												{c.status === "SCHEDULED" && c.scheduledAt
													? `Sends ${formatDateTimeWithZone(c.scheduledAt)}`
													: formatDateTime(c.createdAt)}{" "}
												· {c.format}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-3 text-sm">
											<span className="text-muted-foreground">
												{c.sentCount}/{c.totalRecipients} sent
												{c.failedCount > 0 ? ` · ${c.failedCount} failed` : ""}
											</span>
											<Badge variant={statusVariant(c.status)}>
												{c.status}
											</Badge>
										</div>
									</Link>
								))}
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
