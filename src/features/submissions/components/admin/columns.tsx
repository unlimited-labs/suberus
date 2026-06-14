import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
	createActionsColumn,
	createSelectColumn,
	DataTableColumnHeader,
	facetedFilterFn,
} from "@/components/admin/data-table";
import {
	type SubmissionTodo,
	statusFilterOptions,
	statusLabels,
	statusVariants,
	type TodoKind,
	todoBadgeVariant,
	todoFilterOptions,
	todoLabel,
	todoSortRank,
	todoTone,
	todoTooltip,
	typeFilterOptions,
	typeLabels,
} from "@/features/submissions/labels";
import type { AdminSubmission } from "@/features/submissions/server/admin-submissions";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";

function DateCell({ date }: { date: Date | string }) {
	const { formatDate } = useDateFormat();
	return (
		<span className="text-sm text-muted-foreground">{formatDate(date)}</span>
	);
}

function TodoCell({ todo }: { todo: SubmissionTodo }) {
	const label = todoLabel(todo);
	const tooltip = todoTooltip(todo);
	const body =
		todoTone(todo.kind) === "action" ? (
			<Badge variant={todoBadgeVariant[todo.kind]}>{label}</Badge>
		) : (
			<span className="text-xs text-muted-foreground">{label}</span>
		);

	if (!tooltip) return body;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex cursor-help">{body}</span>
				</TooltipTrigger>
				<TooltipContent>{tooltip}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export const submissionColumns: ColumnDef<AdminSubmission>[] = [
	createSelectColumn<AdminSubmission>(),
	{
		accessorKey: "sequentialNumber",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="No." />
		),
		cell: ({ row }) => {
			const num = row.getValue("sequentialNumber") as number;
			return <span className="text-muted-foreground font-mono">{num}</span>;
		},
		size: 60,
	},
	{
		accessorKey: "title",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Title" />
		),
		cell: ({ row }) => {
			const title = row.getValue("title") as string;
			return (
				<div className="max-w-[300px]">
					<Link
						to="/admin/submissions/$id"
						params={{ id: row.original.id }}
						className="line-clamp-2 font-medium text-foreground hover:underline"
					>
						{title}
					</Link>
				</div>
			);
		},
	},
	{
		accessorKey: "type",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Type"
				filterOptions={[...typeFilterOptions]}
			/>
		),
		cell: ({ row }) => {
			const type = row.getValue("type") as string;
			return (
				<Badge variant="outline">
					{typeLabels[type as keyof typeof typeLabels] ?? type}
				</Badge>
			);
		},
		filterFn: facetedFilterFn,
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Status"
				filterOptions={[...statusFilterOptions]}
			/>
		),
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			return (
				<Badge
					variant={
						statusVariants[status as keyof typeof statusVariants] ?? "secondary"
					}
				>
					{statusLabels[status as keyof typeof statusLabels] ?? status}
				</Badge>
			);
		},
		filterFn: facetedFilterFn,
	},
	{
		accessorKey: "ownerName",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Author" />
		),
		cell: ({ row }) => {
			const name = row.getValue("ownerName") as string;
			const email = row.original.ownerEmail;
			return (
				<div className="flex flex-col">
					<span className="text-foreground">{name}</span>
					<span className="text-xs text-muted-foreground">{email}</span>
				</div>
			);
		},
	},
	{
		accessorKey: "currentRound",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Round" />
		),
		cell: ({ row }) => {
			const round = row.getValue("currentRound") as number;
			return <span className="text-muted-foreground">R{round}</span>;
		},
	},
	{
		id: "todo",
		accessorFn: (row) => row.todo.kind,
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="TODO"
				filterOptions={[...todoFilterOptions]}
			/>
		),
		cell: ({ row }) => <TodoCell todo={row.original.todo} />,
		filterFn: facetedFilterFn,
		sortingFn: (a, b) =>
			todoSortRank[a.getValue<TodoKind>("todo")] -
			todoSortRank[b.getValue<TodoKind>("todo")],
		size: 160,
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Submitted" />
		),
		cell: ({ row }) => <DateCell date={row.getValue("createdAt")} />,
	},
	{
		accessorKey: "updatedAt",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Last updated" />
		),
		cell: ({ row }) => <DateCell date={row.getValue("updatedAt")} />,
	},
	createActionsColumn<AdminSubmission>({
		getViewLink: (submission) => ({
			to: "/admin/submissions/$id",
			params: { id: submission.id },
		}),
	}),
];
