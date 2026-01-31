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
import type { SubmissionStatus } from "@/generated/prisma/enums";
import { statusChangeOptions } from "@/lib/labels/submission";
import { getReviewers, type MockUser } from "@/lib/mock-data/users";
import type { AdminSubmission } from "@/lib/server/admin/submissions";
import {
	assignReviewer,
	bulkChangeStatus,
} from "@/lib/server/admin/submissions";

interface SubmissionBulkActionsProps {
	table: Table<AdminSubmission>;
}

export function SubmissionBulkActions({ table }: SubmissionBulkActionsProps) {
	const selectedRows = table.getFilteredSelectedRowModel().rows;
	const selectedCount = selectedRows.length;

	const [selectedAction, setSelectedAction] = useState<string>("");
	const [statusDialogOpen, setStatusDialogOpen] = useState(false);
	const [reviewerDialogOpen, setReviewerDialogOpen] = useState(false);
	const [selectedStatus, setSelectedStatus] =
		useState<SubmissionStatus>("UNDER_REVIEW");
	const [selectedReviewer, setSelectedReviewer] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	const reviewers: MockUser[] = getReviewers();

	if (selectedCount === 0) return null;

	const handleApply = () => {
		setErrors([]);
		if (selectedAction === "change_status") {
			setStatusDialogOpen(true);
		} else if (selectedAction === "assign_reviewer") {
			setReviewerDialogOpen(true);
		}
	};

	const handleChangeStatus = () => {
		setIsLoading(true);
		setErrors([]);
		try {
			const submissionIds = selectedRows.map((row) => row.original.id);
			const result = bulkChangeStatus({
				submissionIds,
				status: selectedStatus,
			});
			if (result.errors.length > 0) {
				setErrors(result.errors);
			} else {
				table.resetRowSelection();
				setStatusDialogOpen(false);
				setSelectedAction("");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleAssignReviewer = () => {
		setIsLoading(true);
		setErrors([]);
		try {
			const submissionIds = selectedRows.map((row) => row.original.id);
			const result = assignReviewer({
				submissionIds,
				reviewerId: selectedReviewer,
			});
			if (result.errors.length > 0) {
				setErrors(result.errors);
			} else {
				table.resetRowSelection();
				setReviewerDialogOpen(false);
				setSelectedAction("");
			}
		} finally {
			setIsLoading(false);
		}
	};

	const actions = [
		{ value: "change_status", label: "Change status" },
		{ value: "assign_reviewer", label: "Assign reviewer" },
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
				open={statusDialogOpen}
				onOpenChange={setStatusDialogOpen}
				title="Change submission status"
				description={`Select new status for ${selectedCount} selected submissions. Some status changes may not be allowed depending on the current submission state.`}
				onConfirm={handleChangeStatus}
				isLoading={isLoading}
				errors={errors}
			>
				<Select
					value={selectedStatus}
					onValueChange={(v) => setSelectedStatus(v as SubmissionStatus)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select status" />
					</SelectTrigger>
					<SelectContent>
						{statusChangeOptions.map((status) => (
							<SelectItem key={status.value} value={status.value}>
								{status.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</BulkActionDialog>

			<BulkActionDialog
				open={reviewerDialogOpen}
				onOpenChange={setReviewerDialogOpen}
				title="Assign reviewer"
				description={`Select reviewer to assign to ${selectedCount} selected submissions.`}
				onConfirm={handleAssignReviewer}
				isLoading={isLoading}
				errors={errors}
				confirmLabel="Assign"
				loadingLabel="Assigning..."
				confirmDisabled={!selectedReviewer}
			>
				<Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
					<SelectTrigger>
						<SelectValue placeholder="Select reviewer" />
					</SelectTrigger>
					<SelectContent>
						{reviewers.map((reviewer) => (
							<SelectItem key={reviewer.id} value={reviewer.id}>
								<div className="flex flex-col">
									<span>
										{reviewer.firstName} {reviewer.lastName}
									</span>
									<span className="text-xs text-muted-foreground">
										{reviewer.affiliation}
									</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</BulkActionDialog>
		</>
	);
}
