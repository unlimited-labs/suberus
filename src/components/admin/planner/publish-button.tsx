import {
	IconAlertTriangle,
	IconCheck,
	IconLoader2,
	IconWorld,
	IconWorldOff,
} from "@tabler/icons-react";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	publishScheduleFn,
	scheduleIssuesQueryOptions,
	scheduleStateQueryOptions,
	unpublishScheduleFn,
} from "@/utils/schedule.functions";

const ISSUE_LABELS: Record<string, string> = {
	SESSION_WITHOUT_CHAIR: "Session without chair",
	SLOT_DURATION_OVERFLOW: "Presentations exceed session duration",
	ROOM_DOUBLE_BOOKED: "Room double-booked",
	CHAIR_OVERLAP: "Chair in overlapping sessions",
	AUTHOR_OVERLAP: "Author in overlapping sessions",
	NON_ACCEPTED_SUBMISSION: "Non-accepted submission in program",
	SESSION_OUT_OF_BOUNDS: "Session outside conference dates",
};

interface PublishButtonProps {
	onSessionClick?: (sessionId: string) => void;
}

export function PublishButton({ onSessionClick }: PublishButtonProps = {}) {
	const queryClient = useQueryClient();
	const { data: state } = useSuspenseQuery(scheduleStateQueryOptions());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [busy, setBusy] = useState(false);

	const { data: issues, isLoading: issuesLoading } = useQuery({
		...scheduleIssuesQueryOptions(),
		enabled: dialogOpen,
	});

	const isPublished = state.status === "PUBLISHED";

	const invalidate = () => {
		queryClient.invalidateQueries({
			queryKey: scheduleStateQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: scheduleIssuesQueryOptions().queryKey,
		});
	};

	const handlePublish = async () => {
		setBusy(true);
		try {
			await publishScheduleFn();
			invalidate();
			setDialogOpen(false);
			toast.success("Program published");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to publish");
		} finally {
			setBusy(false);
		}
	};

	const handleUnpublish = async () => {
		setBusy(true);
		try {
			await unpublishScheduleFn();
			invalidate();
			toast.success("Program unpublished");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to unpublish");
		} finally {
			setBusy(false);
		}
	};

	if (isPublished) {
		return (
			<Button
				size="sm"
				variant="outline"
				className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
				disabled={busy}
				onClick={handleUnpublish}
			>
				{busy ? (
					<IconLoader2 size={14} className="animate-spin" />
				) : (
					<IconWorldOff size={14} />
				)}
				Unpublish
			</Button>
		);
	}

	return (
		<>
			<Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
				<IconWorld size={14} />
				Publish
			</Button>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Publish program</DialogTitle>
					</DialogHeader>

					<div className="flex min-h-0 flex-1 flex-col gap-3 py-2">
						{issuesLoading ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<IconLoader2 size={14} className="animate-spin" />
								Checking for issues…
							</div>
						) : issues && issues.length > 0 ? (
							<>
								<p className="shrink-0 text-sm text-muted-foreground">
									{issues.length} issue{issues.length !== 1 ? "s" : ""} found.
									You can still publish.
								</p>
								<ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
									{issues.map((issue, i) => {
										const targetId = issue.sessionIds[0];
										const body = (
											<>
												<IconAlertTriangle
													size={14}
													className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
												/>
												<div className="flex-1">
													<p className="font-medium text-amber-900 dark:text-amber-200">
														{ISSUE_LABELS[issue.kind] ?? issue.kind}
													</p>
													<p className="text-xs text-amber-700 dark:text-amber-400">
														{issue.message}
													</p>
												</div>
											</>
										);
										if (onSessionClick && targetId) {
											return (
												<li key={`${issue.kind}-${i}`}>
													<button
														type="button"
														onClick={() => {
															onSessionClick(targetId);
															setDialogOpen(false);
														}}
														className="flex w-full items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900"
													>
														{body}
													</button>
												</li>
											);
										}
										return (
											<li
												key={`${issue.kind}-${i}`}
												className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950"
											>
												{body}
											</li>
										);
									})}
								</ul>
							</>
						) : (
							<div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
								<IconCheck size={14} className="shrink-0" />
								No issues found. Ready to publish.
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							disabled={busy || issuesLoading}
							onClick={handlePublish}
							className="gap-1.5"
						>
							{busy ? (
								<IconLoader2 size={14} className="animate-spin" />
							) : (
								<IconWorld size={14} />
							)}
							{issues && issues.length > 0 ? "Publish anyway" : "Publish"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
