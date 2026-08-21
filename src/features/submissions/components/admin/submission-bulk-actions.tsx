import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { reviewerUsersQueryOptions } from "@/features/reviews/api/reviewers";
import {
	bulkAssignReviewerFn,
	bulkChangeStatusFn,
	bulkUpdateSubmissionTrackFn,
} from "@/features/submissions/api/admin-submissions";
import { statusChangeOptions } from "@/features/submissions/labels";
import type { AdminSubmission } from "@/features/submissions/server/admin-submissions";
import type { AvailableTrack } from "@/features/submissions/types";
import type { SubmissionStatus } from "@/generated/prisma/enums";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { BulkActionDialog } from "@/shared/ui/data-table";
import type { AppTable } from "@/shared/ui/data-table/table-features";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface SubmissionBulkActionsProps {
	table: AppTable<AdminSubmission>;
	availableTracks: AvailableTrack[];
	onSuccess?: () => void;
}

export function SubmissionBulkActions({
	table,
	availableTracks,
	onSuccess,
}: SubmissionBulkActionsProps) {
	const selectedRows = table.getFilteredSelectedRowModel().rows;
	const selectedCount = selectedRows.length;

	const [selectedAction, setSelectedAction] = useState<string>("");
	const [statusDialogOpen, setStatusDialogOpen] = useState(false);
	const [reviewerDialogOpen, setReviewerDialogOpen] = useState(false);
	const [trackDialogOpen, setTrackDialogOpen] = useState(false);
	const [selectedStatus, setSelectedStatus] =
		useState<SubmissionStatus>("UNDER_REVIEW");
	const [selectedReviewer, setSelectedReviewer] = useState<string>("");
	const [selectedTrack, setSelectedTrack] = useState<string>("");
	const { data: reviewers = [] } = useQuery(reviewerUsersQueryOptions());
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	if (selectedCount === 0) return null;

	const handleApply = () => {
		setErrors([]);
		if (selectedAction === "change_status") {
			setStatusDialogOpen(true);
		} else if (selectedAction === "assign_reviewer") {
			setReviewerDialogOpen(true);
		} else if (selectedAction === "assign_track") {
			setTrackDialogOpen(true);
		}
	};

	const handleChangeStatus = async () => {
		setIsLoading(true);
		setErrors([]);
		try {
			const submissionIds = selectedRows.map((row) => row.original.id);
			const result = await bulkChangeStatusFn({
				data: { submissionIds, status: selectedStatus },
			});
			if (result.errors.length > 0) {
				setErrors(result.errors);
			} else {
				toast.success(`Updated ${result.updated} submission(s)`);
				table.resetRowSelection();
				setStatusDialogOpen(false);
				setSelectedAction("");
				onSuccess?.();
			}
		} catch (error) {
			setErrors([getErrorMessage(error, "Failed to change status")]);
		}
		setIsLoading(false);
	};

	const handleAssignReviewer = async () => {
		setIsLoading(true);
		setErrors([]);
		try {
			const submissionIds = selectedRows.map((row) => row.original.id);
			const result = await bulkAssignReviewerFn({
				data: { submissionIds, reviewerId: selectedReviewer },
			});
			if (result.errors.length > 0) {
				setErrors(result.errors);
			} else {
				toast.success(`Assigned reviewer to ${result.assigned} submission(s)`);
				table.resetRowSelection();
				setReviewerDialogOpen(false);
				setSelectedAction("");
				onSuccess?.();
			}
		} catch (error) {
			setErrors([getErrorMessage(error, "Failed to assign reviewer")]);
		}
		setIsLoading(false);
	};

	const handleAssignTrack = async () => {
		setIsLoading(true);
		setErrors([]);
		try {
			const submissionIds = selectedRows.map((row) => row.original.id);

			// Validate all submissions are ABSTRACT (client-side guard needed because
			// server throws Response which is handled at router level, not caught by try/catch)
			const nonAbstractSubmissions = selectedRows.filter(
				(row) => row.original.type !== "ABSTRACT",
			);

			if (nonAbstractSubmissions.length > 0) {
				const titles = nonAbstractSubmissions
					.map((row) => row.original.title)
					.join(", ");
				setErrors([
					`The following submissions are not ABSTRACT type and cannot be assigned to tracks: ${titles}`,
				]);
				setIsLoading(false);
				return;
			}

			await bulkUpdateSubmissionTrackFn({
				data: {
					submissionIds,
					trackId:
						selectedTrack && selectedTrack !== "none" ? selectedTrack : null,
				},
			});

			toast.success(`Updated ${submissionIds.length} submission(s)`);
			table.resetRowSelection();
			setTrackDialogOpen(false);
			setSelectedAction("");
			onSuccess?.();
		} catch (error) {
			setErrors([getErrorMessage(error, "Failed to assign track")]);
		}
		setIsLoading(false);
	};

	const actions = [
		{ value: "change_status", label: "Change status" },
		{ value: "assign_reviewer", label: "Assign reviewer" },
		{ value: "assign_track", label: "Assign to track" },
	];

	return (
		<>
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">
					{selectedCount} selected
				</span>
				<Select
					items={actions}
					onValueChange={setSelectedAction}
					value={selectedAction}
				>
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
				<Button disabled={!selectedAction} onClick={handleApply} size="sm">
					Apply
				</Button>
			</div>

			<BulkActionDialog
				description={`Select new status for ${selectedCount} selected submissions. Some status changes may not be allowed depending on the current submission state.`}
				errors={errors}
				isLoading={isLoading}
				onConfirm={handleChangeStatus}
				onOpenChange={setStatusDialogOpen}
				open={statusDialogOpen}
				title="Change submission status"
			>
				<Select
					items={statusChangeOptions}
					// SAFETY: the select renders only SubmissionStatus options.
					onValueChange={(v) => setSelectedStatus(v as SubmissionStatus)}
					value={selectedStatus}
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
				confirmDisabled={!selectedReviewer}
				confirmLabel="Assign"
				description={`Select reviewer to assign to ${selectedCount} selected submissions.`}
				errors={errors}
				isLoading={isLoading}
				loadingLabel="Assigning..."
				onConfirm={handleAssignReviewer}
				onOpenChange={setReviewerDialogOpen}
				open={reviewerDialogOpen}
				title="Assign reviewer"
			>
				<Select
					items={reviewers.map((reviewer) => ({
						value: reviewer.id,
						label: reviewer.name,
					}))}
					onValueChange={setSelectedReviewer}
					value={selectedReviewer}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select reviewer" />
					</SelectTrigger>
					<SelectContent>
						{reviewers.map((reviewer) => (
							<SelectItem key={reviewer.id} value={reviewer.id}>
								<div className="flex flex-col">
									<span>{reviewer.name}</span>
									<span className="text-muted-foreground text-xs">
										{reviewer.email}
									</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</BulkActionDialog>

			<BulkActionDialog
				confirmLabel="Assign"
				description={`Assign ${selectedCount} selected submission(s) to a conference track. Only ABSTRACT submissions can be assigned.`}
				errors={errors}
				isLoading={isLoading}
				loadingLabel="Assigning..."
				onConfirm={handleAssignTrack}
				onOpenChange={setTrackDialogOpen}
				open={trackDialogOpen}
				title="Assign to track"
			>
				<Select
					items={[
						{ value: "none", label: "None" },
						...availableTracks.map((track) => ({
							value: track.id,
							label: track.name,
						})),
					]}
					onValueChange={setSelectedTrack}
					value={selectedTrack}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select track" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">None</SelectItem>
						{availableTracks.map((track) => (
							<SelectItem key={track.id} value={track.id}>
								{track.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</BulkActionDialog>
		</>
	);
}
