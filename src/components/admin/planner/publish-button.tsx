import {
	IconAlertTriangle,
	IconCheck,
	IconEye,
	IconLoader2,
	IconWorld,
	IconWorldOff,
} from "@tabler/icons-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	publishScheduleDraftFn,
	publishScheduleFn,
	scheduleIssuesQueryOptions,
	scheduleStateQueryOptions,
	unpublishScheduleFn,
} from "@/server-fns/planner/schedule";
import { getErrorMessage } from "@/shared/lib/error-message";
import { useInvalidatePlannerQueries } from "./hooks/use-invalidate-planner-queries";
import { usePlannerSelection } from "./planner-context";

const ISSUE_LABELS: Record<string, string> = {
	SESSION_WITHOUT_CHAIR: "Session without chair",
	SLOT_DURATION_OVERFLOW: "Presentations exceed session duration",
	ROOM_DOUBLE_BOOKED: "Room double-booked",
	CHAIR_OVERLAP: "Chair in overlapping sessions",
	AUTHOR_OVERLAP: "Author in overlapping sessions",
	NON_ACCEPTED_SUBMISSION: "Non-accepted submission in program",
	SESSION_OUT_OF_BOUNDS: "Session outside conference dates",
};

type Mode = "draft" | "public";

export function PublishButton() {
	const invalidate = useInvalidatePlannerQueries();
	const { selectSession } = usePlannerSelection();
	const { data: state } = useSuspenseQuery(scheduleStateQueryOptions());
	const [dialogOpen, setDialogOpen] = useState(false);
	const [busy, setBusy] = useState<Mode | "unpublish" | null>(null);

	const { data: issues, isLoading: issuesLoading } = useQuery({
		...scheduleIssuesQueryOptions(),
		enabled: dialogOpen,
	});

	const status = state.status;
	const isPublished = status === "PUBLISHED";
	const isDraftPublished = status === "DRAFT_PUBLISHED";

	const handlePublish = async (mode: Mode) => {
		setBusy(mode);
		try {
			if (mode === "public") {
				await publishScheduleFn();
				toast.success("Program published");
			} else {
				await publishScheduleDraftFn();
				toast.success("Draft shared with admins");
			}
			invalidate();
			setDialogOpen(false);
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to publish"));
		} finally {
			setBusy(null);
		}
	};

	const handleUnpublish = async () => {
		setBusy("unpublish");
		try {
			await unpublishScheduleFn();
			invalidate();
			toast.success("Program unpublished");
		} catch (e) {
			toast.error(getErrorMessage(e, "Failed to unpublish"));
		} finally {
			setBusy(null);
		}
	};

	if (isPublished) {
		return (
			<Button
				size="sm"
				variant="outline"
				data-testid="unpublish-button"
				className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
				disabled={busy !== null}
				onClick={handleUnpublish}
			>
				{busy === "unpublish" ? (
					<IconLoader2 size={14} className="animate-spin" />
				) : (
					<IconWorldOff size={14} />
				)}
				Unpublish
			</Button>
		);
	}

	const topButtonLabel = isDraftPublished ? "Draft published" : "Publish";
	const topButtonIcon = isDraftPublished ? (
		<IconEye size={14} />
	) : (
		<IconWorld size={14} />
	);

	return (
		<TooltipProvider>
			<Button
				size="sm"
				data-testid="publish-button"
				variant={isDraftPublished ? "outline" : "default"}
				className={`gap-1.5 ${
					isDraftPublished
						? "text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950"
						: ""
				}`}
				onClick={() => setDialogOpen(true)}
			>
				{topButtonIcon}
				{topButtonLabel}
			</Button>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent
					data-testid="publish-dialog"
					className="flex max-h-[85vh] flex-col sm:max-w-md"
				>
					<DialogHeader>
						<DialogTitle>Publish program</DialogTitle>
						<DialogDescription className="sr-only">
							Review schedule issues and publish the program.
						</DialogDescription>
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
								<ul
									data-testid="publish-issues-list"
									className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1"
								>
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
										if (targetId) {
											return (
												<li
													key={`${issue.kind}-${i}`}
													data-testid={`publish-issue-${i}`}
												>
													<button
														type="button"
														onClick={() => {
															selectSession(targetId);
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
												data-testid={`publish-issue-${i}`}
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

						{isDraftPublished && (
							<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
								Program is shared with admins only. Publish to make it visible
								to everyone, or unpublish to hide it completely.
							</div>
						)}
					</div>

					<DialogFooter className="gap-2 sm:flex-row sm:justify-between">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setDialogOpen(false)}
						>
							Cancel
						</Button>
						<div className="flex flex-col gap-2 sm:flex-row">
							{isDraftPublished ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											disabled={busy !== null}
											onClick={handleUnpublish}
											data-testid="publish-unpublish"
											className="gap-1.5"
										>
											{busy === "unpublish" ? (
												<IconLoader2 size={14} className="animate-spin" />
											) : (
												<IconWorldOff size={14} />
											)}
											Unpublish
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										Revert to DRAFT and hide Program from everyone.
									</TooltipContent>
								</Tooltip>
							) : (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											disabled={busy !== null || issuesLoading}
											onClick={() => handlePublish("draft")}
											data-testid="publish-draft-confirm"
											className="gap-1.5"
										>
											{busy === "draft" ? (
												<IconLoader2 size={14} className="animate-spin" />
											) : (
												<IconEye size={14} />
											)}
											Publish draft
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										Share with admins only (visible in their menu). Not public.
									</TooltipContent>
								</Tooltip>
							)}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="sm"
										disabled={busy !== null || issuesLoading}
										onClick={() => handlePublish("public")}
										data-testid="publish-confirm"
										className="gap-1.5"
									>
										{busy === "public" ? (
											<IconLoader2 size={14} className="animate-spin" />
										) : (
											<IconWorld size={14} />
										)}
										{issues && issues.length > 0 ? "Publish anyway" : "Publish"}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									Make the program public — visible to everyone.
								</TooltipContent>
							</Tooltip>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}
