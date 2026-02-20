import {
	IconCalendar,
	IconLoader2,
	IconSearch,
	IconUser,
	IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDateFormat } from "@/hooks/use-date-format";
import { assignmentStatusColors } from "@/lib/labels/assignment";
import {
	type AssignmentWithReviewer,
	type AvailableReviewer,
	assignReviewerFn,
	cancelAssignmentFn,
	getAvailableReviewersFn,
	getSubmissionAssignmentsFn,
} from "@/utils/assignments.functions";

interface AssignReviewerDialogProps {
	submissionId: string;
	submissionTitle: string;
	minReviewers: number;
	maxReviewers: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAssigned?: () => void;
}

export function AssignReviewerDialog({
	submissionId,
	submissionTitle,
	minReviewers,
	maxReviewers,
	open,
	onOpenChange,
	onAssigned,
}: AssignReviewerDialogProps) {
	const { formatDate } = useDateFormat();
	const [search, setSearch] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isAssigning, setIsAssigning] = useState(false);
	const [availableReviewers, setAvailableReviewers] = useState<
		AvailableReviewer[]
	>([]);
	const [currentAssignments, setCurrentAssignments] = useState<
		AssignmentWithReviewer[]
	>([]);
	const [customDeadline, setCustomDeadline] = useState("");

	async function loadData() {
		setIsLoading(true);
		try {
			const [reviewers, assignments] = await Promise.all([
				getAvailableReviewersFn({ data: { submissionId } }),
				getSubmissionAssignmentsFn({ data: { submissionId } }),
			]);
			setAvailableReviewers(reviewers);
			setCurrentAssignments(assignments);
		} catch (_error) {
			toast.error("Failed to load reviewers");
		} finally {
			setIsLoading(false);
		}
	}

	// Load data when dialog opens
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadData is stable
	useEffect(() => {
		if (open) {
			loadData();
		}
	}, [open, submissionId]);

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

	const canAssignMore = activeAssignments.length < maxReviewers;

	async function handleAssign(reviewerId: string) {
		if (!canAssignMore) {
			toast.error(`Maximum ${maxReviewers} reviewers allowed`);
			return;
		}

		setIsAssigning(true);
		try {
			const result = await assignReviewerFn({
				data: {
					submissionId,
					reviewerId,
					deadline: customDeadline || undefined,
				},
			});

			if (result.success) {
				toast.success("Reviewer assigned");
				await loadData();
				onAssigned?.();
			} else {
				toast.error(result.error || "Failed to assign reviewer");
			}
		} catch (_error) {
			toast.error("Failed to assign reviewer");
		} finally {
			setIsAssigning(false);
		}
	}

	async function handleCancel(assignmentId: string) {
		try {
			const result = await cancelAssignmentFn({
				data: { assignmentId },
			});

			if (result.success) {
				toast.success("Assignment cancelled");
				await loadData();
				onAssigned?.();
			} else {
				toast.error(result.error || "Failed to cancel assignment");
			}
		} catch (_error) {
			toast.error("Failed to cancel assignment");
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Assign Reviewers</DialogTitle>
					<DialogDescription className="truncate">
						{submissionTitle}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Current Assignments */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-base">
								Current Reviewers ({activeAssignments.length}/{maxReviewers})
							</Label>
							<Badge
								variant={
									activeAssignments.length >= minReviewers
										? "default"
										: "secondary"
								}
							>
								{activeAssignments.length >= minReviewers
									? "Min. met"
									: `Need ${minReviewers - activeAssignments.length} more`}
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
										key={assignment.id}
										className="flex items-center justify-between rounded-lg border p-3"
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="font-medium truncate">
													{assignment.reviewerName}
												</span>
												<Badge
													variant="outline"
													className={assignmentStatusColors[assignment.status]}
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
												variant="ghost"
												size="icon"
												className="shrink-0"
												onClick={() => handleCancel(assignment.id)}
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

					{/* Custom Deadline */}
					{canAssignMore && (
						<div className="space-y-2">
							<Label htmlFor="deadline">
								Custom deadline (optional, default from config)
							</Label>
							<Input
								id="deadline"
								type="date"
								value={customDeadline}
								onChange={(e) => setCustomDeadline(e.target.value)}
								min={new Date().toISOString().split("T")[0]}
							/>
						</div>
					)}

					{/* Available Reviewers */}
					{canAssignMore && (
						<div className="space-y-3">
							<Label className="text-base">Available Reviewers</Label>

							<div className="relative">
								<IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									placeholder="Search by name, email, or affiliation..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-10"
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
											key={reviewer.id}
											className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
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
													<Badge variant="outline" className="text-xs">
														{reviewer.activeAssignmentsCount} active
													</Badge>
													<Badge variant="outline" className="text-xs">
														{reviewer.completedReviewsCount} completed
													</Badge>
												</div>
											</div>
											<Button
												size="sm"
												onClick={() => handleAssign(reviewer.id)}
												disabled={isAssigning}
											>
												{isAssigning ? (
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
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
