import {
	IconEye,
	IconLoader2,
	IconWorld,
	IconWorldOff,
} from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";
import { usePublishState } from "./hooks/use-publish-state";
import { usePlannerSelection } from "./planner-context";
import { PublishDialog } from "./publish-dialog";

export function PublishButton() {
	const { selectSession } = usePlannerSelection();
	const {
		isPublished,
		isDraftPublished,
		dialogOpen,
		setDialogOpen,
		busy,
		issues,
		issuesLoading,
		publish,
		unpublish,
	} = usePublishState();

	if (isPublished) {
		return (
			<Button
				size="sm"
				variant="outline"
				data-testid="unpublish-button"
				className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
				disabled={busy !== null}
				onClick={unpublish}
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
		<>
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

			<PublishDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				isDraftPublished={isDraftPublished}
				busy={busy}
				issues={issues}
				issuesLoading={issuesLoading}
				onPublish={publish}
				onUnpublish={unpublish}
				onSelectIssue={(sessionId) => {
					selectSession(sessionId);
					setDialogOpen(false);
				}}
			/>
		</>
	);
}
