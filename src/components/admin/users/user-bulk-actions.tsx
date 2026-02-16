import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import { useState } from "react";
import { BulkActionDialog } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/generated/prisma/enums";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { userRoleOptions } from "@/lib/labels/user";
import type { AdminUser } from "@/lib/server/admin/users";
import {
	adminUsersQueryOptions,
	bulkAdminAction,
} from "@/utils/admin-users.functions";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/utils/settings.functions";

interface UserBulkActionsProps {
	table: Table<AdminUser>;
}

interface BulkActionPayload {
	action: "mark_fee" | "change_role";
	userIds: string[];
	feeType?: string;
	feeAmount?: number;
	feeCurrency?: string;
	role?: UserRole;
}

export function UserBulkActions({ table }: UserBulkActionsProps) {
	const queryClient = useQueryClient();
	const { canChangeRoles } = useAdminAuth();
	const selectedRows = table.getFilteredSelectedRowModel().rows;
	const selectedCount = selectedRows.length;

	const { data: dynamicFeeTypes } = useSuspenseQuery(feeTypesQueryOptions());
	const { data: feeCurrency } = useSuspenseQuery(feeCurrencyQueryOptions());

	const feeTypes = dynamicFeeTypes as Array<{
		id: string;
		name: string;
		amount: number;
	}>;
	const currency = feeCurrency as string;

	const [selectedAction, setSelectedAction] = useState<string>("");
	const [feeDialogOpen, setFeeDialogOpen] = useState(false);
	const [roleDialogOpen, setRoleDialogOpen] = useState(false);
	const [selectedFeeTypeId, setSelectedFeeTypeId] = useState<string>(
		feeTypes[0]?.id ?? "",
	);
	const [selectedRole, setSelectedRole] = useState<UserRole>("AUTHOR");

	const selectedFeeType = feeTypes.find((ft) => ft.id === selectedFeeTypeId);

	const mutation = useMutation({
		mutationFn: (payload: BulkActionPayload) =>
			bulkAdminAction({ data: payload }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			});
			table.resetRowSelection();
			setFeeDialogOpen(false);
			setRoleDialogOpen(false);
			setSelectedAction("");
		},
	});

	if (selectedCount === 0) return null;

	const handleApply = () => {
		if (selectedAction === "mark_fee") {
			setFeeDialogOpen(true);
		} else if (selectedAction === "change_role") {
			setRoleDialogOpen(true);
		}
	};

	const handleMarkFeesPaid = () => {
		if (!selectedFeeType) return;
		const userIds = selectedRows.map((row) => row.original.id);
		mutation.mutate({
			action: "mark_fee",
			userIds,
			feeType: selectedFeeType.name,
			feeAmount: selectedFeeType.amount,
			feeCurrency: currency,
		});
	};

	const handleChangeRole = () => {
		const userIds = selectedRows.map((row) => row.original.id);
		mutation.mutate({
			action: "change_role",
			userIds,
			role: selectedRole,
		});
	};

	const actions = [
		{ value: "mark_fee", label: "Mark fee paid" },
		...(canChangeRoles ? [{ value: "change_role", label: "Change role" }] : []),
	];

	return (
		<>
			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground">
					{selectedCount} selected
				</span>
				<Select value={selectedAction} onValueChange={setSelectedAction}>
					<SelectTrigger className="h-8 w-[180px]">
						<SelectValue placeholder="Bulk actions" />
					</SelectTrigger>
					<SelectContent>
						{actions.map((action) => (
							<SelectItem key={action.value} value={action.value}>
								{action.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button size="sm" onClick={handleApply} disabled={!selectedAction}>
					Apply
				</Button>
			</div>

			<BulkActionDialog
				open={feeDialogOpen}
				onOpenChange={setFeeDialogOpen}
				title="Mark fee as paid"
				description={`Select fee type for ${selectedCount} selected users.`}
				onConfirm={handleMarkFeesPaid}
				isLoading={mutation.isPending}
			>
				<Select value={selectedFeeTypeId} onValueChange={setSelectedFeeTypeId}>
					<SelectTrigger>
						<SelectValue placeholder="Select fee type" />
					</SelectTrigger>
					<SelectContent>
						{feeTypes.map((type) => (
							<SelectItem key={type.id} value={type.id}>
								{type.name} — {type.amount.toFixed(2)} {currency}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</BulkActionDialog>

			<BulkActionDialog
				open={roleDialogOpen}
				onOpenChange={setRoleDialogOpen}
				title="Change user role"
				description={`Select new role for ${selectedCount} selected users.`}
				onConfirm={handleChangeRole}
				isLoading={mutation.isPending}
			>
				<Select
					value={selectedRole}
					onValueChange={(v) => setSelectedRole(v as UserRole)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select role" />
					</SelectTrigger>
					<SelectContent>
						{userRoleOptions.map((role) => (
							<SelectItem key={role.value} value={role.value}>
								{role.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</BulkActionDialog>
		</>
	);
}
