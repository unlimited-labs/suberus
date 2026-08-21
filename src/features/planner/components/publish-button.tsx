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
				className="gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
				data-testid="unpublish-button"
				disabled={busy !== null}
				onClick={unpublish}
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
				className={`gap-1.5 ${
					isDraftPublished
						? "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
						: ""
				}`}
				data-testid="publish-button"
				onClick={() => setDialogOpen(true)}
				size="sm"
				variant={isDraftPublished ? "outline" : "default"}
			>
				{topButtonIcon}
				{topButtonLabel}
			</Button>

			<PublishDialog
				busy={busy}
				isDraftPublished={isDraftPublished}
				issues={issues}
				issuesLoading={issuesLoading}
				onOpenChange={setDialogOpen}
				onPublish={publish}
				onSelectIssue={(sessionId) => {
					selectSession(sessionId);
					setDialogOpen(false);
				}}
				onUnpublish={unpublish}
				open={dialogOpen}
			/>
		</>
	);
}
