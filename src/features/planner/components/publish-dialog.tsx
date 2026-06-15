import {
	IconEye,
	IconLoader2,
	IconWorld,
	IconWorldOff,
} from "@tabler/icons-react";
import type { ScheduleIssue } from "@/features/planner/server/schedule";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";
import type { PublishMode } from "./hooks/use-publish-state";
import { PublishIssuesPanel } from "./publish-issues-panel";

interface PublishDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isDraftPublished: boolean;
	busy: PublishMode | "unpublish" | null;
	issues: ScheduleIssue[] | undefined;
	issuesLoading: boolean;
	onPublish: (mode: PublishMode) => void;
	onUnpublish: () => void;
	onSelectIssue: (sessionId: string) => void;
}

export function PublishDialog({
	open,
	onOpenChange,
	isDraftPublished,
	busy,
	issues,
	issuesLoading,
	onPublish,
	onUnpublish,
	onSelectIssue,
}: PublishDialogProps) {
	return (
		<TooltipProvider>
			<Dialog open={open} onOpenChange={onOpenChange}>
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

					<PublishIssuesPanel
						issues={issues}
						issuesLoading={issuesLoading}
						isDraftPublished={isDraftPublished}
						onSelectIssue={onSelectIssue}
					/>

					<DialogFooter className="gap-2 sm:flex-row sm:justify-between">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onOpenChange(false)}
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
											onClick={onUnpublish}
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
											onClick={() => onPublish("draft")}
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
										onClick={() => onPublish("public")}
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
