import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/features/settings/api/settings";
import {
	adminUserDetailQueryOptions,
	adminUsersQueryOptions,
	patchAdminUser,
	resendSetPasswordEmail,
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

	const resendMutation = useMutation({
		mutationFn: () => resendSetPasswordEmail({ data: { id: user.id } }),
		onSuccess: ({ emailSent }) => {
			if (emailSent) {
				toast.success("Set-password link sent");
			} else {
				toast.error(
					"Could not send the email — check SMTP and that the “Account Created by Organizer” template is enabled",
				);
			}
		},
		onError: () => {
			toast.error("Failed to send set-password link");
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
		isResendPending: resendMutation.isPending,
		handleResendSetPassword: () => resendMutation.mutate(),
		handleMarkFeePaid,
		handleUnmarkFeePaid,
		handleChangeRole,
		handleToggleActive,
		handleToggleLateSubmission,
		handleVerifyEmail,
	};
}
