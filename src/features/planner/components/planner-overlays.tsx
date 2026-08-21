import { BreakEditorSheet } from "@/features/planner/components/break-editor-sheet";
import { CreateSessionDialog } from "@/features/planner/components/create-session-dialog";
import { usePlannerSelection } from "@/features/planner/components/planner-context";
import { SessionEditorSheet } from "@/features/planner/components/session-editor-sheet";

interface PlannerOverlaysProps {
	users: React.ComponentProps<typeof SessionEditorSheet>["users"];
	defaultStartAt: React.ComponentProps<
		typeof CreateSessionDialog
	>["defaultStartAt"];
	timezone: string | undefined;
	onSessionCreated: () => void;
}

/**
 * The planner's transient editors: session + break sheets and the
 * create-session dialog. Reads its open/selection state from planner context so
 * the route shell stays free of selection plumbing.
 */
export function PlannerOverlays({
	users,
	defaultStartAt,
	timezone,
	onSessionCreated,
}: PlannerOverlaysProps) {
	const {
		selectedSessionId,
		selectedBreakId,
		clearSelection,
		creationSubmissionIds,
		closeCreateFromSelection,
	} = usePlannerSelection();

	return (
		<>
			<SessionEditorSheet
				onClose={clearSelection}
				sessionId={selectedSessionId}
				users={users}
			/>
			<BreakEditorSheet breakId={selectedBreakId} onClose={clearSelection} />
			{creationSubmissionIds && (
				<CreateSessionDialog
					defaultStartAt={defaultStartAt}
					onClose={closeCreateFromSelection}
					onCreated={onSessionCreated}
					open={true}
					submissionIds={creationSubmissionIds}
					timezone={timezone}
				/>
			)}
		</>
	);
}
