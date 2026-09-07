import { IconSpeakerphone, IconTableImport } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
	announcementsQueryOptions,
	createAnnouncementDraftFromSheet,
	matchAnnouncementSheet,
	parseAnnouncementSheet,
} from "@/features/announcements/api/announcements";
import { sheetAnnouncementCreateInput } from "@/features/announcements/validations";
import { PageHeader } from "@/shared/components/layout/page-header";
import { SheetWizardDialog } from "@/shared/components/sheet-wizard/sheet-wizard-dialog";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";

export function AnnouncementList() {
	const { data: announcements } = useSuspenseQuery(announcementsQueryOptions());
	const { formatDateTime } = useDateFormat();
	const [importOpen, setImportOpen] = useState(false);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconSpeakerphone} title="Announcements">
				<Button
					data-testid="import-sheet-btn"
					onClick={() => setImportOpen(true)}
				>
					<IconTableImport className="size-4" />
					Import spreadsheet
				</Button>
			</PageHeader>
			<SheetWizardDialog
				createErrorMessage="Could not create the announcement"
				createFromSheet={async (data) => {
					const { announcementId } = await createAnnouncementDraftFromSheet({
						data,
					});
					return announcementId;
				}}
				createLabel="Create announcement"
				createSchema={sheetAnnouncementCreateInput}
				matchSheet={(input) => matchAnnouncementSheet({ data: input })}
				onCreated={async (id) => {
					await queryClient.invalidateQueries({
						queryKey: announcementsQueryOptions().queryKey,
					});
					setImportOpen(false);
					await navigate({ to: "/admin/announcements/$id", params: { id } });
				}}
				onOpenChange={setImportOpen}
				open={importOpen}
				parseSheet={(body) => parseAnnouncementSheet({ data: body })}
				unmatchedMode="confirm"
			/>
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl">
					{announcements.length === 0 ? (
						<EmptyState
							description="Start one from the Users table, or import a spreadsheet."
							icon={IconSpeakerphone}
							title="No announcements yet"
						/>
					) : (
						<Card>
							<CardContent
								className="divide-y p-0"
								data-testid="announcement-list"
							>
								{announcements.map((a) => (
									<Link
										className="hover:bg-muted/40 flex items-center justify-between gap-4 px-4 py-3"
										key={a.id}
										params={{ id: a.id }}
										to="/admin/announcements/$id"
									>
										<div className="min-w-0">
											<p className="truncate font-medium">
												{a.subject || "(no subject)"}
											</p>
											<p className="text-muted-foreground text-xs">
												{formatDateTime(a.publishedAt ?? a.createdAt)}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-3 text-sm">
											<span className="text-muted-foreground tabular-nums">
												{a.totalRecipients}{" "}
												{a.totalRecipients === 1 ? "person" : "people"}
											</span>
											<Badge
												variant={
													a.status === "PUBLISHED" ? "default" : "secondary"
												}
											>
												{a.status}
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
