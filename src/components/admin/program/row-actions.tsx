import { IconEdit, IconLoader2, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

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
					variant="destructive"
					size="sm"
					onClick={onConfirmDelete}
					disabled={isBusy}
					data-testid={`${testIdPrefix}-confirm-delete`}
				>
					{isBusy && <IconLoader2 className="mr-1 size-4 animate-spin" />}
					Confirm
				</Button>
				<Button variant="outline" size="sm" onClick={onCancelDelete}>
					Cancel
				</Button>
			</div>
		);
	}

	return (
		<div className="flex justify-end gap-2">
			<Button
				variant="ghost"
				size="icon"
				onClick={onEdit}
				aria-label="Edit"
				data-testid={`${testIdPrefix}-edit`}
			>
				<IconEdit className="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onClick={onAskDelete}
				disabled={isBusy || deleteDisabled}
				aria-label="Delete"
				data-testid={`${testIdPrefix}-delete`}
			>
				<IconTrash className="size-4" />
			</Button>
		</div>
	);
}
