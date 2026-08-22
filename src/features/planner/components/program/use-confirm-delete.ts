import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/shared/lib/error-message";

interface UseConfirmDeleteOptions {
	onDelete: (id: string) => Promise<void>;
	successMessage: string;
	fallbackErrorMessage: string;
	onMutated: () => void;
}

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
		}
		setPendingId(null);
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
