import {
	IconAlertTriangle,
	IconEye,
	IconLoader2,
	IconWorld,
	IconWorldOff,
} from "@tabler/icons-react";
import { useId, useState } from "react";
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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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

const CONFIRM_PHRASE = "UNDERSTOOD";

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
	const inputId = useId();
	const [phrase, setPhrase] = useState("");
	const confirmed = phrase.trim() === CONFIRM_PHRASE;

	return (
		<div className="border-destructive/40 bg-destructive/5 space-y-3 rounded-md border p-3">
			<div className="text-muted-foreground flex gap-2 text-sm">
				<IconAlertTriangle
					className="text-destructive mt-0.5 shrink-0"
					size={16}
				/>
				<p>
					Publishing makes the whole program public — visible to everyone on the
					public program page and to search engines, including session times,
					speakers and camera-ready files. It can only be taken back with
					Unpublish.
				</p>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor={inputId}>Type {CONFIRM_PHRASE} to confirm</Label>
				<Input
					autoComplete="off"
					data-testid="publish-understood-input"
					id={inputId}
					onChange={(e) => setPhrase(e.target.value)}
					placeholder={CONFIRM_PHRASE}
					value={phrase}
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
