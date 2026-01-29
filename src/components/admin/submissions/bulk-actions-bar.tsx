import { IconStatusChange, IconUserPlus } from "@tabler/icons-react";
import type { Table } from "@tanstack/react-table";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { SubmissionStatus } from "@/generated/prisma";
import { getReviewers, type MockUser } from "@/lib/mock-data/users";
import type { AdminSubmission } from "@/lib/server/admin/submissions";
import {
	assignReviewer,
	bulkChangeStatus,
} from "@/lib/server/admin/submissions";

interface BulkActionsBarProps {
	table: Table<AdminSubmission>;
}

const statusOptions: { value: SubmissionStatus; label: string }[] = [
	{ value: "UNDER_REVIEW", label: "Under Review" },
	{ value: "ACCEPTED", label: "Accepted" },
	{ value: "CONDITIONALLY_ACCEPTED", label: "Conditionally Accepted" },
	{ value: "REVISE_REQUIRED", label: "Revision Required" },
	{ value: "REJECTED", label: "Rejected" },
];

export function BulkActionsBar({ table }: BulkActionsBarProps) {
	const selectedRows = table.getFilteredSelectedRowModel().rows;
	const selectedCount = selectedRows.length;

	const [statusDialogOpen, setStatusDialogOpen] = useState(false);
	const [reviewerDialogOpen, setReviewerDialogOpen] = useState(false);
	const [selectedStatus, setSelectedStatus] =
		useState<SubmissionStatus>("UNDER_REVIEW");
	const [selectedReviewer, setSelectedReviewer] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	const reviewers: MockUser[] = getReviewers();

	if (selectedCount === 0) return null;

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
			}
			// TODO: Refresh data / invalidate query
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
			}
			// TODO: Refresh data / invalidate query
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
				<span className="text-sm font-medium">{selectedCount} selected</span>
				<div className="h-4 w-px bg-border" />
				<Button
					variant="outline"
					size="sm"
					onClick={() => setStatusDialogOpen(true)}
				>
					<IconStatusChange className="mr-2 size-4" />
					Change status
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setReviewerDialogOpen(true)}
				>
					<IconUserPlus className="mr-2 size-4" />
					Assign reviewer
				</Button>
			</div>

			{/* Status Dialog */}
			<Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change submission status</DialogTitle>
						<DialogDescription>
							Select new status for {selectedCount} selected submissions. Some
							status changes may not be allowed depending on the current
							submission state.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-4">
						<Select
							value={selectedStatus}
							onValueChange={(v) => setSelectedStatus(v as SubmissionStatus)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select status" />
							</SelectTrigger>
							<SelectContent>
								{statusOptions.map((status) => (
									<SelectItem key={status.value} value={status.value}>
										{status.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.length > 0 && (
							<Alert variant="destructive">
								<AlertDescription>
									<ul className="list-disc pl-4 space-y-1">
										{errors.map((error, i) => (
											<li key={i}>{error}</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setStatusDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleChangeStatus} disabled={isLoading}>
							{isLoading ? "Saving..." : "Save"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Reviewer Dialog */}
			<Dialog open={reviewerDialogOpen} onOpenChange={setReviewerDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Assign reviewer</DialogTitle>
						<DialogDescription>
							Select reviewer to assign to {selectedCount} selected submissions.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-4">
						<Select
							value={selectedReviewer}
							onValueChange={setSelectedReviewer}
						>
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
						{errors.length > 0 && (
							<Alert variant="destructive">
								<AlertDescription>
									<ul className="list-disc pl-4 space-y-1">
										{errors.map((error, i) => (
											<li key={i}>{error}</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setReviewerDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleAssignReviewer}
							disabled={isLoading || !selectedReviewer}
						>
							{isLoading ? "Assigning..." : "Assign"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
