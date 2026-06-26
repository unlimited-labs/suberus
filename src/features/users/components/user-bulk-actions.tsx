import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { RowSelectionState, Table } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { createBulkEmailDraft } from "@/features/bulk-email/api/bulk-email";
import { BulkGenerateDialog } from "@/features/documents/components/bulk-generate-dialog";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/features/settings/api/settings";
import {
	adminUsersQueryOptions,
	bulkAdminAction,
} from "@/features/users/api/users";
import {
	type AssignableUserRole,
	assignableRoleOptions,
} from "@/features/users/labels";
import type { AdminUser } from "@/features/users/server/users";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { BulkActionDialog } from "@/shared/ui/data-table";
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
	const navigate = useNavigate();
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
	const [generateDocsOpen, setGenerateDocsOpen] = useState(false);
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

	const emailDraftMutation = useMutation({
		mutationFn: (userIds: string[]) =>
			createBulkEmailDraft({ data: { userIds } }),
		onSuccess: ({ campaignId }) => {
			navigate({ to: "/admin/bulk-email/$id", params: { id: campaignId } });
		},
		onError: (e) =>
			toast.error(getErrorMessage(e, "Failed to start bulk email")),
	});

	if (selectedCount === 0) return null;

	const handleApply = () => {
		if (selectedAction === "mark_fee") {
			setFeeDialogOpen(true);
		} else if (selectedAction === "change_role") {
			setRoleDialogOpen(true);
		} else if (selectedAction === "send_email") {
			emailDraftMutation.mutate(selectedRows.map((row) => row.original.id));
		} else if (selectedAction === "generate_document") {
			setGenerateDocsOpen(true);
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

	// Shares the bulk-action toolbar shape with submission-bulk-actions.tsx and
	// data-table-bulk-actions.tsx (a pre-existing 3-way pattern). Deduping these
	// belongs in one coordinated refactor of all three, not this feature.
	// fallow-ignore-next-line code-duplication
	const actions = [
		{ value: "mark_fee", label: "Mark fee paid" },
		...(canChangeRoles ? [{ value: "change_role", label: "Change role" }] : []),
		{ value: "send_email", label: "Send email" },
		{ value: "generate_document", label: "Generate document" },
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

			<BulkGenerateDialog
				open={generateDocsOpen}
				onOpenChange={(o) => {
					setGenerateDocsOpen(o);
					if (!o) setSelectedAction("");
				}}
				userIds={selectedRows.map((row) => row.original.id)}
				onDone={() => table.resetRowSelection()}
			/>
		</>
	);
}
