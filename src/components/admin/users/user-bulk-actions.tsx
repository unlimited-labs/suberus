import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { FeeType, UserRole } from "@/generated/prisma";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { feeTypeOptions, userRoleOptions } from "@/lib/labels/user";
import type { AdminUser } from "@/lib/server/admin/users";
import { bulkAdminAction } from "@/utils/admin-users.functions";

interface UserBulkActionsProps {
	table: Table<AdminUser>;
}

interface BulkActionPayload {
	action: "mark_fee" | "change_role";
	userIds: string[];
	feeType?: FeeType;
	role?: UserRole;
}

export function UserBulkActions({ table }: UserBulkActionsProps) {
	const queryClient = useQueryClient();
	const { canChangeRoles } = useAdminAuth();
	const selectedRows = table.getFilteredSelectedRowModel().rows;
	const selectedCount = selectedRows.length;

	const [selectedAction, setSelectedAction] = useState<string>("");
	const [feeDialogOpen, setFeeDialogOpen] = useState(false);
	const [roleDialogOpen, setRoleDialogOpen] = useState(false);
	const [selectedFeeType, setSelectedFeeType] = useState<FeeType>("FULL");
	const [selectedRole, setSelectedRole] = useState<UserRole>("AUTHOR");

	const mutation = useMutation({
		mutationFn: (payload: BulkActionPayload) =>
			bulkAdminAction({ data: payload }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
		const userIds = selectedRows.map((row) => row.original.id);
		mutation.mutate({
			action: "mark_fee",
			userIds,
			feeType: selectedFeeType,
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
				<Select
					value={selectedFeeType}
					onValueChange={(v) => setSelectedFeeType(v as FeeType)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select fee type" />
					</SelectTrigger>
					<SelectContent>
						{feeTypeOptions.map((type) => (
							<SelectItem key={type.value} value={type.value}>
								{type.label}
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
