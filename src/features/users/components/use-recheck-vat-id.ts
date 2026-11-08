import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	adminUsersQueryOptions,
	recheckAdminUserVatId,
} from "@/features/users/api/users";
import { getErrorMessage } from "@/shared/lib/error-message";

export function useRecheckVatId(userId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => recheckAdminUserVatId({ data: { id: userId } }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			}),
		onError: (error) =>
			toast.error(getErrorMessage(error, "Could not re-check the VAT ID")),
	});
}
