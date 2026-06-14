import {
	IconAlertTriangle,
	IconCircleCheck,
	IconClock,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { compareAsc, differenceInCalendarDays } from "date-fns";
import {
	DataTableColumnHeader,
	facetedFilterFn,
} from "@/components/admin/data-table";
import type { ReviewerAssignment } from "@/features/reviews/api/assignments";
import {
	assignmentStatusFilterOptions,
	assignmentStatusLabels,
	assignmentStatusVariants,
} from "@/features/reviews/labels";
import { typeFilterOptions, typeLabels } from "@/features/submissions/labels";
import type { AssignmentStatus } from "@/generated/prisma/enums";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

function DeadlineCell({
	deadline,
	status,
}: {
	deadline: Date | null;
	status: string;
}) {
	const { formatDate } = useDateFormat();

	if (!deadline)
		return (
			<span className="text-muted-foreground text-sm italic">No deadline</span>
		);

	const daysRemaining = differenceInCalendarDays(deadline, new Date());
	const isPast = daysRemaining < 0;
	const isUrgent = daysRemaining <= 3 && daysRemaining >= 0;

	const dateStr = formatDate(deadline);

	if (status === "COMPLETED") {
		return (
			<div className="flex items-center gap-2">
				<IconCircleCheck className="size-4 text-primary shrink-0" />
				<span className="text-sm text-muted-foreground">{dateStr}</span>
			</div>
		);
	}

	if (isPast || status === "OVERDUE") {
		return (
			<div className="flex items-center gap-2">
				<IconAlertTriangle className="size-4 text-destructive shrink-0" />
				<div className="flex flex-col">
					<span className="text-sm font-semibold text-destructive">
						{Math.abs(daysRemaining)}d overdue
					</span>
					<span className="text-xs text-muted-foreground">{dateStr}</span>
				</div>
			</div>
		);
	}

	if (isUrgent) {
		return (
			<div className="flex items-center gap-2">
				<IconClock className="size-4 text-destructive shrink-0 animate-pulse" />
				<div className="flex flex-col">
					<span className="text-sm font-semibold text-destructive">
						{daysRemaining}d left
					</span>
					<span className="text-xs text-muted-foreground">{dateStr}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<IconClock className="size-4 text-muted-foreground shrink-0" />
			<div className="flex flex-col">
				<span className="text-sm font-medium text-foreground">
					{daysRemaining}d left
				</span>
				<span className="text-xs text-muted-foreground">{dateStr}</span>
			</div>
		</div>
	);
}

export const reviewColumns: ColumnDef<ReviewerAssignment>[] = [
	{
		accessorKey: "submissionTitle",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Submission" />
		),
		cell: ({ row }) => {
			const title = row.getValue("submissionTitle") as string;
			const round = row.original.round;

			return (
				<div className="flex flex-col gap-1 max-w-[400px]">
					<span className="line-clamp-2 font-medium text-foreground">
						{title}
					</span>
					{round > 1 && (
						<span className="text-xs text-muted-foreground">R{round}</span>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: "authorName",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Author" />
		),
		cell: ({ row }) => {
			const name = row.original.authorName;
			const affiliation = row.original.authorAffiliation;
			const isAnonymous = name === "Anonymous Author";

			if (isAnonymous) {
				return (
					<span className="text-sm italic text-muted-foreground">
						Double-blind review
					</span>
				);
			}

			return (
				<div className="flex flex-col">
					<span className="text-foreground font-medium">{name}</span>
					<span className="text-xs text-muted-foreground">{affiliation}</span>
				</div>
			);
		},
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Status"
				filterOptions={[...assignmentStatusFilterOptions]}
			/>
		),
		cell: ({ row }) => {
			const status = row.getValue("status") as AssignmentStatus;
			const variant =
				assignmentStatusVariants[
					status as keyof typeof assignmentStatusVariants
				] ?? "secondary";

			return (
				<Badge variant={variant}>
					{assignmentStatusLabels[
						status as keyof typeof assignmentStatusLabels
					] ?? status}
				</Badge>
			);
		},
		filterFn: facetedFilterFn,
	},
	{
		accessorKey: "deadline",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Deadline" />
		),
		cell: ({ row }) => {
			const deadline = row.original.deadline;
			const status = row.original.status;
			return <DeadlineCell deadline={deadline} status={status} />;
		},
		sortingFn: (rowA, rowB) => {
			const a = rowA.original.deadline;
			const b = rowB.original.deadline;
			if (!a && !b) return 0;
			if (!a) return 1;
			if (!b) return -1;
			return compareAsc(a, b);
		},
	},
	{
		accessorKey: "submissionType",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Type"
				filterOptions={[...typeFilterOptions]}
			/>
		),
		cell: ({ row }) => {
			const type = row.getValue("submissionType") as string;
			return (
				<Badge variant="outline">
					{typeLabels[type as keyof typeof typeLabels] ?? type}
				</Badge>
			);
		},
		filterFn: facetedFilterFn,
		enableSorting: false,
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const assignment = row.original;
			const isCompleted = assignment.status === "COMPLETED";
			const isCancelled = assignment.status === "CANCELLED";

			if (isCancelled) return null;

			return (
				<div className="flex justify-end">
					<Button
						asChild
						variant={isCompleted ? "outline" : "default"}
						size="sm"
					>
						{isCompleted ? (
							<Link
								to="/reviews/$assignmentId"
								params={{ assignmentId: assignment.id }}
							>
								View Review
							</Link>
						) : (
							<Link
								to="/reviews/$assignmentId"
								params={{ assignmentId: assignment.id }}
							>
								Submit Review
							</Link>
						)}
					</Button>
				</div>
			);
		},
	},
];
