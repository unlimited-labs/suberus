import { useQuery } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
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
import { getErrorMessage } from "@/lib/error-message";
import { statusChangeOptions } from "@/lib/labels/submission";
import type { AdminSubmission } from "@/lib/server/admin/submissions";
import {
	bulkAssignReviewerFn,
	bulkChangeStatusFn,
	bulkUpdateSubmissionTrackFn,
} from "@/server-fns/admin/submissions";
import { reviewerUsersQueryOptions } from "@/server-fns/reviews/reviewers";
import { activeTracksQueryOptions } from "@/server-fns/tracks";

interface SubmissionBulkActionsProps {
	table: Table<AdminSubmission>;
	onSuccess?: () => void;
}

export function SubmissionBulkActions({
	table,
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
	const { data: availableTracks = [] } = useQuery(activeTracksQueryOptions());
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
		} finally {
			setIsLoading(false);
		}
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
		} finally {
			setIsLoading(false);
		}
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
		} finally {
			setIsLoading(false);
		}
	};

	const actions = [
		{ value: "change_status", label: "Change status" },
		{ value: "assign_reviewer", label: "Assign reviewer" },
		{ value: "assign_track", label: "Assign to track" },
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
									<span>{reviewer.name}</span>
									<span className="text-xs text-muted-foreground">
										{reviewer.email}
									</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</BulkActionDialog>

			<BulkActionDialog
				open={trackDialogOpen}
				onOpenChange={setTrackDialogOpen}
				title="Assign to track"
				description={`Assign ${selectedCount} selected submission(s) to a conference track. Only ABSTRACT submissions can be assigned.`}
				onConfirm={handleAssignTrack}
				isLoading={isLoading}
				errors={errors}
				confirmLabel="Assign"
				loadingLabel="Assigning..."
			>
				<Select value={selectedTrack} onValueChange={setSelectedTrack}>
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
