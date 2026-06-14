import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/shared/lib/error-message";

interface UseConfirmDeleteOptions {
	onDelete: (id: string) => Promise<void>;
	successMessage: string;
	fallbackErrorMessage: string;
	onMutated: () => void;
}

/**
 * Two-step row deletion with an inline confirm/cancel affordance.
 *
 * Owns the "which row is busy" (`pendingId`) and "which row is awaiting
 * confirmation" (`confirmId`) state. `setPendingId` is exposed so a list with
 * other per-row async actions (e.g. reorder) can share the same busy flag.
 */
export function useConfirmDelete({
	onDelete,
	successMessage,
	fallbackErrorMessage,
	onMutated,
}: UseConfirmDeleteOptions) {
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [confirmId, setConfirmId] = useState<string | null>(null);

	const remove = async (id: string) => {
		setPendingId(id);
		setConfirmId(null);
		try {
			await onDelete(id);
			toast.success(successMessage);
			onMutated();
		} catch (error) {
			toast.error(getErrorMessage(error, fallbackErrorMessage));
		} finally {
			setPendingId(null);
		}
	};

	return {
		pendingId,
		setPendingId,
		confirmId,
		askDelete: (id: string) => setConfirmId(id),
		cancelDelete: () => setConfirmId(null),
		remove,
	};
}
