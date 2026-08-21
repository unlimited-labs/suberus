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
} from "@/features/users/api/users";
import type { AdminUser } from "@/features/users/server/users";
import { Badge } from "@/shared/ui/badge";
import { UserFeeDialog } from "./user-fee-dialog";

type FeeUser = Pick<
	AdminUser,
	"id" | "firstName" | "lastName" | "email" | "fee"
>;

export function UserFeeBadgeCell({
	mobile,
	user,
}: {
	mobile?: boolean;
	user: FeeUser;
}) {
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);
	const { data: feeTypes } = useSuspenseQuery(feeTypesQueryOptions());
	const { data: currency } = useSuspenseQuery(feeCurrencyQueryOptions());
	const [selectedFeeTypeId, setSelectedFeeTypeId] = useState(
		feeTypes.find((ft) => ft.name === user.fee?.type)?.id ??
			feeTypes[0]?.id ??
			"",
	);
	const selectedFeeType = feeTypes.find((ft) => ft.id === selectedFeeTypeId);

	const mutation = useMutation({
		mutationFn: (payload: Parameters<typeof patchAdminUser>[0]["data"]) =>
			patchAdminUser({ data: payload }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: adminUserDetailQueryOptions(user.id).queryKey,
			});
			setOpen(false);
		},
		onError: () => toast.error("Could not update the fee status"),
	});

	const paid = user.fee?.paid ?? false;

	const handleOpen = () => {
		setSelectedFeeTypeId(
			feeTypes.find((ft) => ft.name === user.fee?.type)?.id ??
				feeTypes[0]?.id ??
				"",
		);
		setOpen(true);
	};

	return (
		<>
			<button
				className="cursor-pointer"
				data-testid="fee-badge-trigger"
				onClick={handleOpen}
				type="button"
			>
				{paid ? (
					<Badge className="border-green-600 text-green-600" variant="outline">
						{mobile ? "Paid" : user.fee?.type}
					</Badge>
				) : mobile ? (
					<Badge className="border-red-600 text-red-600" variant="outline">
						Unpaid
					</Badge>
				) : (
					<Badge variant="destructive">Unpaid</Badge>
				)}
			</button>
			{open && (
				<UserFeeDialog
					currency={currency}
					currentFeeType={paid ? (user.fee?.type ?? undefined) : undefined}
					feeTypes={feeTypes}
					isPending={mutation.isPending}
					onConfirm={() => {
						if (!selectedFeeType) return;
						mutation.mutate({
							id: user.id,
							markFeePaid: true,
							feeType: selectedFeeType.name,
							feeAmount: selectedFeeType.amount,
							feeCurrency: currency,
						});
					}}
					onFeeTypeChange={setSelectedFeeTypeId}
					onOpenChange={setOpen}
					onUnmark={
						paid
							? () => mutation.mutate({ id: user.id, unmarkFeePaid: true })
							: undefined
					}
					open={open}
					selectedFeeType={selectedFeeType}
					selectedFeeTypeId={selectedFeeTypeId}
					userName={
						`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
						user.email
					}
				/>
			)}
		</>
	);
}
