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
	feeTypeLabels,
	roleFilterOptions,
	roleLabels,
} from "@/lib/labels/user";
import type { AdminUser } from "@/lib/server/admin/users";

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
					{feeTypeLabels[fee.type] ?? fee.type}
				</Badge>
			);
		},
		filterFn: facetedFilterFn,
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
