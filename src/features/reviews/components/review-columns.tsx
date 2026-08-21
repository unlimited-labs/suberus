import {
	IconAlertTriangle,
	IconCircleCheck,
	IconClock,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { compareAsc, differenceInCalendarDays } from "date-fns";
import type { ReviewerAssignment } from "@/features/reviews/api/assignments";
import {
	assignmentStatusFilterOptions,
	assignmentStatusLabels,
	assignmentStatusVariants,
} from "@/features/reviews/labels";
import type { AssignmentStatus } from "@/generated/prisma/enums";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { typeFilterOptions, typeLabels } from "@/shared/lib/labels/submission";
import { lookup } from "@/shared/lib/lookup";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTableColumnHeader, facetedFilterFn } from "@/shared/ui/data-table";
import type { AppColumnDef } from "@/shared/ui/data-table/table-features";

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

export const reviewColumns: AppColumnDef<ReviewerAssignment>[] = [
	{
		accessorKey: "submissionTitle",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Submission" />
		),
		cell: ({ row }) => {
			// SAFETY: TanStack's getValue is untyped; this column holds that type in the row model.
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
				filterOptions={[...assignmentStatusFilterOptions]}
				title="Status"
			/>
		),
		cell: ({ row }) => {
			// SAFETY: TanStack's getValue is untyped; this column holds that type in the row model.
			const status = row.getValue("status") as AssignmentStatus;
			const variant = lookup(assignmentStatusVariants, status) ?? "secondary";

			return (
				<Badge variant={variant}>
					{lookup(assignmentStatusLabels, status) ?? status}
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
		sortFn: (rowA, rowB) => {
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
				filterOptions={[...typeFilterOptions]}
				title="Type"
			/>
		),
		cell: ({ row }) => {
			// SAFETY: TanStack's getValue is untyped; this column holds that type in the row model.
			const type = row.getValue("submissionType") as string;
			return (
				<Badge variant="outline">{lookup(typeLabels, type) ?? type}</Badge>
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
						size="sm"
						variant={isCompleted ? "outline" : "default"}
					>
						{isCompleted ? (
							<Link
								params={{ assignmentId: assignment.id }}
								to="/reviews/$assignmentId"
							>
								View Review
							</Link>
						) : (
							<Link
								params={{ assignmentId: assignment.id }}
								to="/reviews/$assignmentId"
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
