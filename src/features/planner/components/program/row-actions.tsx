import { IconEdit, IconLoader2, IconTrash } from "@tabler/icons-react";
import { Button } from "@/shared/ui/button";

interface RowActionsProps {
	isBusy: boolean;
	isConfirming: boolean;
	deleteDisabled: boolean;
	onEdit: () => void;
	onAskDelete: () => void;
	onConfirmDelete: () => void;
	onCancelDelete: () => void;
	/** testid prefix, e.g. "room" → "room-edit" / "room-delete" / "room-confirm-delete" */
	testIdPrefix: string;
}

/** Inline edit + two-step delete actions for a table row. */
export function RowActions({
	isBusy,
	isConfirming,
	deleteDisabled,
	onEdit,
	onAskDelete,
	onConfirmDelete,
	onCancelDelete,
	testIdPrefix,
}: RowActionsProps) {
	if (isConfirming) {
		return (
			<div className="flex justify-end gap-2">
				<Button
					data-testid={`${testIdPrefix}-confirm-delete`}
					disabled={isBusy}
					onClick={onConfirmDelete}
					size="sm"
					variant="destructive"
				>
					{isBusy && <IconLoader2 className="mr-1 size-4 animate-spin" />}
					Confirm
				</Button>
				<Button onClick={onCancelDelete} size="sm" variant="outline">
					Cancel
				</Button>
			</div>
		);
	}

	return (
		<div className="flex justify-end gap-2">
			<Button
				aria-label="Edit"
				data-testid={`${testIdPrefix}-edit`}
				onClick={onEdit}
				size="icon"
				variant="ghost"
			>
				<IconEdit className="size-4" />
			</Button>
			<Button
				aria-label="Delete"
				data-testid={`${testIdPrefix}-delete`}
				disabled={isBusy || deleteDisabled}
				onClick={onAskDelete}
				size="icon"
				variant="ghost"
			>
				<IconTrash className="size-4" />
			</Button>
		</div>
	);
}
