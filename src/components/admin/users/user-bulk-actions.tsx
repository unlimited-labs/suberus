import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RowSelectionState, Table } from "@tanstack/react-table";
import { useState } from "react";
import { BulkActionDialog } from "@/components/admin/data-table";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
	type AssignableUserRole,
	assignableRoleOptions,
} from "@/lib/labels/user";
import type { AdminUser } from "@/lib/server/admin/users";
import {
	adminUsersQueryOptions,
	bulkAdminAction,
} from "@/server-fns/admin/users";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/server-fns/settings";
import { Button } from "@/shared/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface UserBulkActionsProps {
	table: Table<AdminUser>;
	rowSelection: RowSelectionState;
}

interface BulkActionPayload {
	action: "mark_fee" | "change_role";
	userIds: string[];
	feeType?: string;
	feeAmount?: number;
	feeCurrency?: string;
	role?: AssignableUserRole;
}

export function UserBulkActions({ table, rowSelection }: UserBulkActionsProps) {
	const queryClient = useQueryClient();
	const { canChangeRoles, canAssignAdminRole } = useAdminAuth();
	const roleOptions = assignableRoleOptions(canAssignAdminRole);
	const selectedCount = Object.keys(rowSelection).length;
	const selectedRows = table
		.getCoreRowModel()
		.rows.filter((row) => Boolean(rowSelection[row.id]));

	const { data: feeTypes = [] } = useQuery(feeTypesQueryOptions());
	const { data: currency = "" } = useQuery(feeCurrencyQueryOptions());

	const [selectedAction, setSelectedAction] = useState<string>("");
	const [feeDialogOpen, setFeeDialogOpen] = useState(false);
	const [roleDialogOpen, setRoleDialogOpen] = useState(false);
	const [selectedFeeTypeId, setSelectedFeeTypeId] = useState<string>(
		feeTypes[0]?.id ?? "",
	);
	const [selectedRole, setSelectedRole] =
		useState<AssignableUserRole>("AUTHOR");

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
					onValueChange={(v) => {
						const found = roleOptions.find((opt) => opt.value === v);
						if (found) setSelectedRole(found.value);
					}}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select role" />
					</SelectTrigger>
					<SelectContent>
						{roleOptions.map((role) => (
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
