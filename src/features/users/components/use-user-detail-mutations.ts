import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/features/settings/api/settings";
import {
	adminUserDetailQueryOptions,
	adminUsersQueryOptions,
	patchAdminUser,
} from "@/features/users/api/users";
import type { AssignableUserRole } from "@/features/users/labels";
import type { AdminUserDetail } from "@/features/users/server/users";

interface PatchPayload {
	role?: AssignableUserRole;
	isActive?: boolean;
	allowLateSubmission?: boolean;
	markFeePaid?: boolean;
	feeType?: string;
	feeAmount?: number;
	feeCurrency?: string;
	unmarkFeePaid?: boolean;
	verifyEmail?: boolean;
}

/**
 * Owns all UserDetailCard behaviour: fee/role/edit/delete dialog state, fee-type
 * and role selection, the patch mutation and its action handlers. Leaves the
 * card as pure presentation.
 */
export function useUserDetailMutations(user: AdminUserDetail) {
	const queryClient = useQueryClient();
	const [feeDialogOpen, setFeeDialogOpen] = useState(false);
	const [roleDialogOpen, setRoleDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [surveyDialogOpen, setSurveyDialogOpen] = useState(false);

	const { data: feeTypes } = useSuspenseQuery(feeTypesQueryOptions());
	const { data: currency } = useSuspenseQuery(feeCurrencyQueryOptions());

	const [selectedFeeTypeId, setSelectedFeeTypeId] = useState<string>(
		feeTypes[0]?.id ?? "",
	);
	// EXHIBITOR cannot be granted here (exhibitor signup only), so default to AUTHOR
	const [selectedRole, setSelectedRole] = useState<AssignableUserRole>(
		user.role === "EXHIBITOR" ? "AUTHOR" : user.role,
	);

	const selectedFeeType = feeTypes.find((ft) => ft.id === selectedFeeTypeId);

	const mutation = useMutation({
		mutationFn: (payload: PatchPayload) =>
			patchAdminUser({ data: { id: user.id, ...payload } }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: adminUserDetailQueryOptions(user.id).queryKey,
			});
			setFeeDialogOpen(false);
			setRoleDialogOpen(false);
		},
	});

	const handleMarkFeePaid = () => {
		if (!selectedFeeType) return;
		mutation.mutate({
			markFeePaid: true,
			feeType: selectedFeeType.name,
			feeAmount: selectedFeeType.amount,
			feeCurrency: currency,
		});
	};

	const handleUnmarkFeePaid = () => {
		mutation.mutate({ unmarkFeePaid: true });
	};

	const handleChangeRole = () => {
		mutation.mutate({ role: selectedRole });
	};

	const handleToggleActive = () => {
		mutation.mutate({ isActive: !user.isActive });
	};

	const handleToggleLateSubmission = () => {
		mutation.mutate({ allowLateSubmission: !user.allowLateSubmission });
	};

	const handleVerifyEmail = () => {
		mutation.mutate({ verifyEmail: true });
	};

	return {
		feeTypes,
		currency,
		selectedFeeTypeId,
		setSelectedFeeTypeId,
		selectedFeeType,
		selectedRole,
		setSelectedRole,
		feeDialogOpen,
		setFeeDialogOpen,
		roleDialogOpen,
		setRoleDialogOpen,
		editDialogOpen,
		setEditDialogOpen,
		deleteDialogOpen,
		setDeleteDialogOpen,
		surveyDialogOpen,
		setSurveyDialogOpen,
		isPending: mutation.isPending,
		handleMarkFeePaid,
		handleUnmarkFeePaid,
		handleChangeRole,
		handleToggleActive,
		handleToggleLateSubmission,
		handleVerifyEmail,
	};
}
