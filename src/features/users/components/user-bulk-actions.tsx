import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import {
	bulkEmailCampaignsQueryOptions,
	createBulkEmailDraft,
} from "@/features/bulk-email/api/bulk-email";
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
import { BulkActionDialog } from "@/shared/ui/data-table";
import type { AppTable } from "@/shared/ui/data-table/table-features";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface UserBulkActionsProps {
	table: AppTable<AdminUser>;
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
		},
	});

	const emailDraftMutation = useMutation({
		mutationFn: (userIds: string[]) =>
			createBulkEmailDraft({ data: { userIds } }),
		onSuccess: ({ campaignId }) => {
			queryClient.invalidateQueries({
				queryKey: bulkEmailCampaignsQueryOptions().queryKey,
			});
			navigate({ to: "/admin/bulk-email/$id", params: { id: campaignId } });
		},
		onError: (e) =>
			toast.error(getErrorMessage(e, "Failed to start bulk email")),
	});

	if (selectedCount === 0) return null;

	const handleSelectAction = (value: string) => {
		if (value === "mark_fee") {
			setFeeDialogOpen(true);
		} else if (value === "change_role") {
			setRoleDialogOpen(true);
		} else if (value === "send_email") {
			emailDraftMutation.mutate(selectedRows.map((row) => row.original.id));
		} else if (value === "generate_document") {
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
				<Select items={actions} onValueChange={handleSelectAction} value="">
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
			</div>

			<BulkActionDialog
				description={`Select fee type for ${selectedCount} selected users.`}
				isLoading={mutation.isPending}
				onConfirm={handleMarkFeesPaid}
				onOpenChange={setFeeDialogOpen}
				open={feeDialogOpen}
				title="Mark fee as paid"
			>
				<Select
					items={feeTypes.map((type) => ({
						value: type.id,
						label: `${type.name} — ${type.amount.toFixed(2)} ${currency}`,
					}))}
					onValueChange={setSelectedFeeTypeId}
					value={selectedFeeTypeId}
				>
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
				description={`Select new role for ${selectedCount} selected users.`}
				isLoading={mutation.isPending}
				onConfirm={handleChangeRole}
				onOpenChange={setRoleDialogOpen}
				open={roleDialogOpen}
				title="Change user role"
			>
				<Select
					items={roleOptions}
					onValueChange={(v) => {
						const found = roleOptions.find((opt) => opt.value === v);
						if (found) setSelectedRole(found.value);
					}}
					value={selectedRole}
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
				onDone={() => table.resetRowSelection()}
				onOpenChange={setGenerateDocsOpen}
				open={generateDocsOpen}
				userIds={selectedRows.map((row) => row.original.id)}
			/>
		</>
	);
}
