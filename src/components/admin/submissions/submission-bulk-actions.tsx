import type { Table } from "@tanstack/react-table";
import { useEffect, useState } from "react";
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
import { statusChangeOptions } from "@/lib/labels/submission";
import { getReviewers, type MockUser } from "@/lib/mock-data/users";
import {
	assignReviewer,
	bulkChangeStatus,
} from "@/lib/server/admin/submissions";
import { bulkUpdateSubmissionSessionFn } from "@/utils/admin-submissions.functions";
import type { AdminSubmission } from "@/utils/admin-submissions.server";
import { getActiveSessionsFn } from "@/utils/sessions.functions";

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
	const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
	const [selectedStatus, setSelectedStatus] =
		useState<SubmissionStatus>("UNDER_REVIEW");
	const [selectedReviewer, setSelectedReviewer] = useState<string>("");
	const [selectedSession, setSelectedSession] = useState<string>("");
	const [availableSessions, setAvailableSessions] = useState<
		{ id: string; name: string }[]
	>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	const reviewers: MockUser[] = getReviewers();

	// Load active sessions
	useEffect(() => {
		getActiveSessionsFn()
			.then(setAvailableSessions)
			.catch(() => {});
	}, []);

	if (selectedCount === 0) return null;

	const handleApply = () => {
		setErrors([]);
		if (selectedAction === "change_status") {
			setStatusDialogOpen(true);
		} else if (selectedAction === "assign_reviewer") {
			setReviewerDialogOpen(true);
		} else if (selectedAction === "assign_session") {
			setSessionDialogOpen(true);
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

	const handleAssignSession = async () => {
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
					`The following submissions are not ABSTRACT type and cannot be assigned to sessions: ${titles}`,
				]);
				return;
			}

			await bulkUpdateSubmissionSessionFn({
				data: {
					submissionIds,
					sessionId:
						selectedSession && selectedSession !== "none"
							? selectedSession
							: null,
				},
			});

			toast.success(`Updated ${submissionIds.length} submission(s)`);
			table.resetRowSelection();
			setSessionDialogOpen(false);
			setSelectedAction("");
			onSuccess?.();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to assign session";
			setErrors([message]);
		} finally {
			setIsLoading(false);
		}
	};

	const actions = [
		{ value: "change_status", label: "Change status" },
		{ value: "assign_reviewer", label: "Assign reviewer" },
		{ value: "assign_session", label: "Assign to session" },
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

			<BulkActionDialog
				open={sessionDialogOpen}
				onOpenChange={setSessionDialogOpen}
				title="Assign to session"
				description={`Assign ${selectedCount} selected submission(s) to a conference session. Only ABSTRACT submissions can be assigned.`}
				onConfirm={handleAssignSession}
				isLoading={isLoading}
				errors={errors}
				confirmLabel="Assign"
				loadingLabel="Assigning..."
			>
				<Select value={selectedSession} onValueChange={setSelectedSession}>
					<SelectTrigger>
						<SelectValue placeholder="Select session" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">None</SelectItem>
						{availableSessions.map((session) => (
							<SelectItem key={session.id} value={session.id}>
								{session.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</BulkActionDialog>
		</>
	);
}
