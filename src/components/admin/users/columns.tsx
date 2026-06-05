import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
	createActionsColumn,
	createSelectColumn,
	DataTableColumnHeader,
	facetedFilterFn,
} from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import {
	feeFilterOptions,
	formatSubmissionRole,
	roleFilterOptions,
	roleLabels,
} from "@/lib/labels/user";
import type { AdminUser } from "@/lib/server/admin/users";
import { cn } from "@/lib/utils";
import { SubmissionsColumnHeader } from "./submissions-column-header";

export const userColumns: ColumnDef<AdminUser>[] = [
	createSelectColumn<AdminUser>(),
	{
		id: "name",
		accessorFn: (row) =>
			`${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || row.email,
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Name"
				textFilter={{ placeholder: "Search..." }}
			/>
		),
		cell: ({ row }) => {
			const firstName = row.original.firstName;
			const lastName = row.original.lastName;
			const name =
				firstName || lastName
					? `${firstName ?? ""} ${lastName ?? ""}`.trim()
					: null;

			return (
				<Link
					to="/admin/users/$id"
					params={{ id: row.original.id }}
					className="flex flex-col hover:underline"
				>
					<span className="font-medium text-foreground">
						{name ?? row.original.email}
					</span>
					{name && (
						<span className="text-xs text-muted-foreground">
							{row.original.email}
						</span>
					)}
				</Link>
			);
		},
		filterFn: "includesString",
	},
	{
		accessorKey: "role",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Role"
				filterOptions={[...roleFilterOptions]}
			/>
		),
		cell: ({ row }) => {
			const role = row.getValue("role") as string;
			return (
				<Badge variant={role === "ADMIN" ? "default" : "secondary"}>
					{roleLabels[role as keyof typeof roleLabels] ?? role}
				</Badge>
			);
		},
		filterFn: facetedFilterFn,
	},
	{
		accessorKey: "affiliation",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Affiliation"
				textFilter={{ placeholder: "Search..." }}
			/>
		),
		cell: ({ row }) => (
			<span className="text-muted-foreground">
				{row.getValue("affiliation") ?? "—"}
			</span>
		),
		filterFn: "includesString",
	},
	{
		accessorKey: "feePaid",
		accessorFn: (row) => (row.fee?.paid ? "paid" : "unpaid"),
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Fee"
				filterOptions={[...feeFilterOptions]}
			/>
		),
		cell: ({ row }) => {
			const fee = row.original.fee;
			if (!fee?.paid) {
				return <Badge variant="destructive">Unpaid</Badge>;
			}
			return (
				<Badge variant="outline" className="text-green-600 border-green-600">
					{fee.type}
				</Badge>
			);
		},
		filterFn: facetedFilterFn,
	},
	{
		id: "submissions",
		accessorFn: (row) =>
			row.submissionRoles.reduce((sum, r) => sum + r.count, 0),
		header: ({ column, table }) => (
			<SubmissionsColumnHeader column={column} table={table} />
		),
		cell: ({ row }) => {
			const roles = row.original.submissionRoles;
			if (roles.length === 0) {
				return (
					<span
						data-testid="user-submissions"
						className="text-muted-foreground"
					>
						—
					</span>
				);
			}
			return (
				<div data-testid="user-submissions" className="flex flex-wrap gap-1">
					{roles.map((r) => (
						<Badge
							key={`${r.type}-${r.role}-${r.draft}`}
							variant="outline"
							className={cn(r.draft && "border-dashed text-muted-foreground")}
						>
							{formatSubmissionRole(r)}
						</Badge>
					))}
				</div>
			);
		},
	},
	{
		id: "submissionType",
		accessorFn: (row) => [...new Set(row.submissionRoles.map((r) => r.type))],
		getUniqueValues: (row) => [
			...new Set(row.submissionRoles.map((r) => r.type)),
		],
		filterFn: "arrIncludesSome",
		enableHiding: false,
		enableSorting: false,
	},
	{
		id: "submissionRole",
		accessorFn: (row) => [...new Set(row.submissionRoles.map((r) => r.role))],
		getUniqueValues: (row) => [
			...new Set(row.submissionRoles.map((r) => r.role)),
		],
		filterFn: "arrIncludesSome",
		enableHiding: false,
		enableSorting: false,
	},
	{
		id: "submissionDraft",
		accessorFn: (row) => [
			...new Set(
				row.submissionRoles.map((r) => (r.draft ? "draft" : "submitted")),
			),
		],
		getUniqueValues: (row) => [
			...new Set(
				row.submissionRoles.map((r) => (r.draft ? "draft" : "submitted")),
			),
		],
		filterFn: "arrIncludesSome",
		enableHiding: false,
		enableSorting: false,
	},
	{
		accessorKey: "isActive",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Status" />
		),
		cell: ({ row }) => {
			const isActive = row.getValue("isActive") as boolean;
			return isActive ? (
				<Badge variant="outline">Active</Badge>
			) : (
				<Badge variant="destructive">Inactive</Badge>
			);
		},
	},
	createActionsColumn<AdminUser>({
		getViewLink: (user) => ({
			to: "/admin/users/$id",
			params: { id: user.id },
		}),
		getEditLink: (user) => ({
			to: "/admin/users/$id",
			params: { id: user.id },
		}),
	}),
];
