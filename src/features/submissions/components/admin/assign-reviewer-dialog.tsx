import { IconCalendar, IconX } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import {
	assignReviewerFn,
	availableReviewersQueryOptions,
	cancelAssignmentFn,
	submissionAssignmentsQueryOptions,
} from "@/features/reviews/api/assignments";
import { assignmentStatusVariants } from "@/features/reviews/labels";
import { submissionKeys } from "@/features/submissions/api/admin-submissions";
import {
	filterPeople,
	PersonPickerList,
} from "@/features/submissions/components/admin/person-picker-list";
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

	const { data: availableReviewers = [], isLoading } = useQuery({
		...availableReviewersQueryOptions(submissionId),
		enabled: open,
	});

	const { data: currentAssignments = [] } = useQuery({
		...submissionAssignmentsQueryOptions(submissionId),
		enabled: open,
	});

	const reviewerRows = availableReviewers.map((r) => ({
		id: r.id,
		name: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
		email: r.email,
		affiliation: r.affiliationName,
		meta: (
			<div className="mt-1 flex gap-2 pl-6">
				<Badge className="text-xs" variant="outline">
					{r.activeAssignmentsCount} active
				</Badge>
				<Badge className="text-xs" variant="outline">
					{r.completedReviewsCount} completed
				</Badge>
			</div>
		),
	}));
	const filteredReviewers = filterPeople(reviewerRows, search);

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
					queryKey: submissionKeys.one(submissionId),
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
					queryKey: submissionKeys.one(submissionId),
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
							<p className="text-muted-foreground text-sm">
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
												<span className="truncate font-medium">
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
											<p className="text-muted-foreground truncate text-sm">
												{assignment.reviewerEmail}
											</p>
											{assignment.deadline && (
												<p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
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

						<PersonPickerList
							actionLabel="Assign"
							emptyLabel="No available reviewers"
							emptySearchLabel="No reviewers found matching search"
							isLoading={isLoading}
							onSearchChange={setSearch}
							onSelect={handleAssign}
							optionTestId="reviewer-option"
							pendingId={assigningReviewerId}
							rows={filteredReviewers}
							search={search}
						/>
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
