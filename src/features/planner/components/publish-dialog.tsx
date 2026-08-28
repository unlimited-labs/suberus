import {
	IconEye,
	IconLoader2,
	IconWorld,
	IconWorldOff,
} from "@tabler/icons-react";
import { useState } from "react";
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
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
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
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent
					className="flex max-h-[85vh] flex-col sm:max-w-md"
					data-testid="publish-dialog"
				>
					<DialogHeader>
						<DialogTitle>Publish program</DialogTitle>
						<DialogDescription className="sr-only">
							Review schedule issues and publish the program.
						</DialogDescription>
					</DialogHeader>

					<PublishIssuesPanel
						isDraftPublished={isDraftPublished}
						issues={issues}
						issuesLoading={issuesLoading}
						onSelectIssue={onSelectIssue}
					/>

					<PublicPublishGate
						busy={busy}
						disabled={busy !== null || issuesLoading}
						hasIssues={Boolean(issues && issues.length > 0)}
						onPublish={onPublish}
					/>

					<DialogFooter className="gap-2 sm:flex-row sm:justify-between">
						<Button
							onClick={() => onOpenChange(false)}
							size="sm"
							variant="ghost"
						>
							Cancel
						</Button>
						<div className="flex flex-col gap-2 sm:flex-row">
							{isDraftPublished ? (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="gap-1.5"
											data-testid="publish-unpublish"
											disabled={busy !== null}
											onClick={onUnpublish}
											size="sm"
											variant="outline"
										>
											{busy === "unpublish" ? (
												<IconLoader2 className="animate-spin" size={14} />
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
											className="gap-1.5"
											data-testid="publish-draft-confirm"
											disabled={busy !== null || issuesLoading}
											onClick={() => onPublish("draft")}
											size="sm"
											variant="outline"
										>
											{busy === "draft" ? (
												<IconLoader2 className="animate-spin" size={14} />
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
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</TooltipProvider>
	);
}

interface PublicPublishGateProps {
	busy: PublishMode | "unpublish" | null;
	disabled: boolean;
	hasIssues: boolean;
	onPublish: (mode: PublishMode) => void;
}

function PublicPublishGate({
	busy,
	disabled,
	hasIssues,
	onPublish,
}: PublicPublishGateProps) {
	const [confirmed, setConfirmed] = useState(false);

	return (
		<div className="border-destructive/40 bg-destructive/5 space-y-3 rounded-md border p-3">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-0.5">
					<Label htmlFor="publish-public-confirm">
						Make the program public
					</Label>
					<p className="text-muted-foreground text-xs">
						Visible to everyone and search engines. Undo with Unpublish.
					</p>
				</div>
				<Switch
					checked={confirmed}
					className="mt-0.5"
					data-testid="publish-understood-switch"
					id="publish-public-confirm"
					onCheckedChange={setConfirmed}
				/>
			</div>
			<Button
				className="w-full gap-1.5"
				data-testid="publish-confirm"
				disabled={disabled || !confirmed}
				onClick={() => onPublish("public")}
				size="sm"
			>
				{busy === "public" ? (
					<IconLoader2 className="animate-spin" size={14} />
				) : (
					<IconWorld size={14} />
				)}
				{hasIssues ? "Publish anyway" : "Publish"}
			</Button>
		</div>
	);
}
