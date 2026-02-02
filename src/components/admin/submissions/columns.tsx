import type { ColumnDef } from "@tanstack/react-table";
import {
	createActionsColumn,
	createSelectColumn,
	DataTableColumnHeader,
	facetedFilterFn,
} from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import {
	statusFilterOptions,
	statusLabels,
	statusVariants,
	typeFilterOptions,
	typeLabels,
} from "@/lib/labels/submission";
import type { AdminSubmission } from "@/utils/admin-submissions.server";

export const submissionColumns: ColumnDef<AdminSubmission>[] = [
	createSelectColumn<AdminSubmission>(),
	{
		accessorKey: "title",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Title" />
		),
		cell: ({ row }) => {
			const title = row.getValue("title") as string;
			return (
				<div className="max-w-[300px]">
					<span className="line-clamp-2 font-medium text-foreground">
						{title}
					</span>
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
	createActionsColumn<AdminSubmission>({
		getViewLink: (submission) => ({
			to: "/admin/submissions/$id",
			params: { id: submission.id },
		}),
	}),
];
