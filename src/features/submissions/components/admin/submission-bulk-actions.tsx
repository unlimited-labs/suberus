import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useWebMCP } from "use-webmcp-tool";
import { z } from "zod";
import { reviewerUsersQueryOptions } from "@/features/reviews/api/reviewers";
import {
	bulkAssignReviewerFn,
	bulkChangeStatusFn,
	bulkUpdateSubmissionTrackFn,
} from "@/features/submissions/api/admin-submissions";
import { statusChangeOptions } from "@/features/submissions/labels";
import type { AdminSubmission } from "@/features/submissions/server/admin-submissions";
import type { AvailableTrack } from "@/features/submissions/types";
import { submissionStatusFilterSchema } from "@/features/submissions/validations";
import type { SubmissionStatus } from "@/generated/prisma/enums";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { BulkActionDialog, BulkActionsToolbar } from "@/shared/ui/data-table";
import type { AppTable } from "@/shared/ui/data-table/table-features";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

const bulkActionInput = z.discriminatedUnion("action", [
	z.object({
		action: z.literal("change_status"),
		status: submissionStatusFilterSchema.describe(
			"Status to move the selected submissions to.",
		),
	}),
	z.object({
		action: z.literal("assign_reviewer"),
		reviewerEmail: z.email().describe("Email of the reviewer to assign."),
	}),
	z.object({
		action: z.literal("assign_track"),
		trackName: z
			.string()
			.nullable()
			.describe("Conference track name; null removes the track."),
	}),
]);

const BULK_ACTION_SCHEMA = z.toJSONSchema(bulkActionInput);
// Submission titles in the result are user-submitted.
const UNTRUSTED_OUTPUT = { untrustedContentHint: true };

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

	const prepare = (args: z.infer<typeof bulkActionInput>) => {
		if (args.action === "change_status") {
			if (!statusChangeOptions.some((o) => o.value === args.status)) {
				return {
					error: `Bulk change to ${args.status} is not allowed.`,
					allowedStatuses: statusChangeOptions.map((o) => o.value),
				};
			}
			setSelectedStatus(args.status);
			setStatusDialogOpen(true);
		} else if (args.action === "assign_reviewer") {
			const email = args.reviewerEmail.toLowerCase();
			const reviewer = reviewers.find((r) => r.email.toLowerCase() === email);
			if (!reviewer) {
				return {
					error: `No reviewer with email ${args.reviewerEmail}.`,
					reviewerEmails: reviewers.map((r) => r.email),
				};
			}
			setSelectedReviewer(reviewer.id);
			setReviewerDialogOpen(true);
		} else {
			const name = args.trackName?.toLowerCase();
			const track = availableTracks.find((t) => t.name.toLowerCase() === name);
			if (name !== undefined && !track) {
				return {
					error: `No track named ${args.trackName}.`,
					trackNames: availableTracks.map((t) => t.name),
				};
			}
			setSelectedTrack(track?.id ?? "none");
			setTrackDialogOpen(true);
		}
		setSelectedAction(args.action);
		setErrors([]);
		return {
			message:
				"The confirmation dialog is open. Nothing changes until the user confirms it.",
			selectedSubmissions: selectedRows.map((row) => row.original.title),
		};
	};

	useWebMCP({
		name: "prepare-bulk-submission-action",
		description:
			"Prepares a bulk change for the submissions the user selected in the table and opens its confirmation dialog. Use when the user wants to act on several submissions at once.",
		inputSchema: BULK_ACTION_SCHEMA,
		annotations: UNTRUSTED_OUTPUT,
		enabled: selectedCount > 0,
		execute: (args) => {
			const parsed = bulkActionInput.safeParse(args);
			if (!parsed.success) return { error: z.prettifyError(parsed.error) };
			return prepare(parsed.data);
		},
	});

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
			<BulkActionsToolbar
				actions={actions}
				onValueChange={setSelectedAction}
				selectedCount={selectedCount}
				value={selectedAction}
			>
				<Button disabled={!selectedAction} onClick={handleApply} size="sm">
					Apply
				</Button>
			</BulkActionsToolbar>

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
