import {
	IconCalendar,
	IconLoader2,
	IconSearch,
	IconUser,
	IconX,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import {
	type AssignmentWithReviewer,
	type AvailableReviewer,
	assignReviewerFn,
	cancelAssignmentFn,
	getAvailableReviewersFn,
	getSubmissionAssignmentsFn,
} from "@/features/reviews/api/assignments";
import { assignmentStatusVariants } from "@/features/reviews/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface AssignReviewerDialogProps {
	submissionId: string;
	submissionTitle: string;
	requiredReviewers: number;
	reviewDeadlineDays: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAssigned?: () => void;
}

function computeDefaultDeadline(days: number): string {
	return format(addDays(new Date(), days), "yyyy-MM-dd");
}

export function AssignReviewerDialog({
	submissionId,
	submissionTitle,
	requiredReviewers,
	reviewDeadlineDays,
	open,
	onOpenChange,
	onAssigned,
}: AssignReviewerDialogProps) {
	const { formatDate } = useDateFormat();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [assigningReviewerId, setAssigningReviewerId] = useState<string | null>(
		null,
	);
	const [customDeadline, setCustomDeadline] = useState("");
	const [prevOpen, setPrevOpen] = useState(false);
	const [prevDeadlineDays, setPrevDeadlineDays] = useState(reviewDeadlineDays);

	if (open !== prevOpen || reviewDeadlineDays !== prevDeadlineDays) {
		setPrevOpen(open);
		setPrevDeadlineDays(reviewDeadlineDays);
		if (open) setCustomDeadline(computeDefaultDeadline(reviewDeadlineDays));
	}

	const { data: availableReviewers = [], isLoading } = useQuery<
		AvailableReviewer[]
	>({
		queryKey: ["submissions", submissionId, "available-reviewers"],
		queryFn: () => getAvailableReviewersFn({ data: { submissionId } }),
		enabled: open,
	});

	const { data: currentAssignments = [] } = useQuery<AssignmentWithReviewer[]>({
		queryKey: ["submissions", submissionId, "assignments"],
		queryFn: () => getSubmissionAssignmentsFn({ data: { submissionId } }),
		enabled: open,
	});

	// Filter reviewers by search
	const filteredReviewers = availableReviewers.filter((r) => {
		const searchLower = search.toLowerCase();
		const name = `${r.firstName ?? ""} ${r.lastName ?? ""}`.toLowerCase();
		return (
			name.includes(searchLower) ||
			r.email.toLowerCase().includes(searchLower) ||
			r.affiliationName?.toLowerCase().includes(searchLower)
		);
	});

	// Active (non-cancelled) assignments
	const activeAssignments = currentAssignments.filter(
		(a) => a.status !== "CANCELLED",
	);

	async function handleAssign(reviewerId: string) {
		setAssigningReviewerId(reviewerId);
		try {
			const result = await assignReviewerFn({
				data: {
					submissionId,
					reviewerId,
					deadline: customDeadline
						? new Date(customDeadline).toISOString()
						: undefined,
				},
			});

			if (result.success) {
				toast.success("Reviewer assigned");
				await queryClient.invalidateQueries({
					queryKey: ["submissions", submissionId],
				});
				onAssigned?.();
			} else {
				toast.error(result.error || "Failed to assign reviewer");
			}
		} catch (_error) {
			toast.error("Failed to assign reviewer");
		}
		setAssigningReviewerId(null);
	}

	async function handleCancel(assignmentId: string) {
		try {
			const result = await cancelAssignmentFn({
				data: { assignmentId },
			});

			if (result.success) {
				toast.success("Assignment cancelled");
				await queryClient.invalidateQueries({
					queryKey: ["submissions", submissionId],
				});
				onAssigned?.();
			} else {
				toast.error(result.error || "Failed to cancel assignment");
			}
		} catch (_error) {
			toast.error("Failed to cancel assignment");
		}
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader className="min-w-0">
					<DialogTitle>Assign Reviewers</DialogTitle>
					<DialogDescription className="truncate">
						{submissionTitle}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-base">
								Current Reviewers ({activeAssignments.length})
							</Label>
							<Badge
								variant={
									activeAssignments.length >= requiredReviewers
										? "default"
										: "secondary"
								}
							>
								{activeAssignments.length >= requiredReviewers
									? "Required met"
									: `Need ${requiredReviewers - activeAssignments.length} more`}
							</Badge>
						</div>

						{activeAssignments.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No reviewers assigned yet
							</p>
						) : (
							<div className="space-y-2">
								{activeAssignments.map((assignment) => (
									<div
										className="flex items-center justify-between rounded-lg border p-3"
										data-testid="current-reviewer-row"
										key={assignment.id}
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="font-medium truncate">
													{assignment.reviewerName}
												</span>
												<Badge
													variant={
														assignmentStatusVariants[assignment.status] ??
														"outline"
													}
												>
													{assignment.status}
												</Badge>
											</div>
											<p className="text-sm text-muted-foreground truncate">
												{assignment.reviewerEmail}
											</p>
											{assignment.deadline && (
												<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
													<IconCalendar className="size-3" />
													Due: {formatDate(new Date(assignment.deadline))}
												</p>
											)}
										</div>
										{assignment.status !== "COMPLETED" && (
											<Button
												className="shrink-0"
												onClick={() => handleCancel(assignment.id)}
												size="icon"
												variant="ghost"
											>
												<IconX className="size-4" />
												<span className="sr-only">Cancel</span>
											</Button>
										)}
									</div>
								))}
							</div>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="deadline">Review deadline</Label>
						<Input
							id="deadline"
							min={format(new Date(), "yyyy-MM-dd")}
							onChange={(e) => setCustomDeadline(e.target.value)}
							suppressHydrationWarning
							type="date"
							value={customDeadline}
						/>
					</div>

					<div className="space-y-3">
						<Label className="text-base">Available Reviewers</Label>

						<div className="relative">
							<IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-10"
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search by name, email, or affiliation..."
								value={search}
							/>
						</div>

						{isLoading ? (
							<div className="flex items-center justify-center py-8">
								<IconLoader2 className="size-6 animate-spin text-muted-foreground" />
							</div>
						) : filteredReviewers.length === 0 ? (
							<p className="text-sm text-muted-foreground py-4 text-center">
								{search
									? "No reviewers found matching search"
									: "No available reviewers"}
							</p>
						) : (
							<div className="max-h-64 overflow-y-auto space-y-2">
								{filteredReviewers.map((reviewer) => (
									<div
										className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
										data-testid="reviewer-option"
										key={reviewer.id}
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<IconUser className="size-4 text-muted-foreground shrink-0" />
												<span className="font-medium truncate">
													{reviewer.firstName} {reviewer.lastName}
												</span>
											</div>
											<p className="text-sm text-muted-foreground truncate pl-6">
												{reviewer.email}
											</p>
											{reviewer.affiliationName && (
												<p className="text-xs text-muted-foreground truncate pl-6">
													{reviewer.affiliationName}
												</p>
											)}
											<div className="flex gap-2 mt-1 pl-6">
												<Badge className="text-xs" variant="outline">
													{reviewer.activeAssignmentsCount} active
												</Badge>
												<Badge className="text-xs" variant="outline">
													{reviewer.completedReviewsCount} completed
												</Badge>
											</div>
										</div>
										<Button
											disabled={assigningReviewerId !== null}
											onClick={() => handleAssign(reviewer.id)}
											size="sm"
										>
											{assigningReviewerId === reviewer.id ? (
												<IconLoader2 className="size-4 animate-spin" />
											) : (
												"Assign"
											)}
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
