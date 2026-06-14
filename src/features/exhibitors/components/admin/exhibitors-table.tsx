import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
	createActionsColumn,
	DataTable,
	DataTableColumnHeader,
	DataTableToolbar,
	type FilterOption,
	facetedFilterFn,
} from "@/components/admin/data-table";
import type { listExhibitorsFn } from "@/features/exhibitors/api/exhibitors";
import { exhibitorStatusBadge } from "@/features/exhibitors/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { ExhibitorMobileCard } from "./exhibitor-mobile-card";

export type AdminExhibitorRow = Awaited<
	ReturnType<typeof listExhibitorsFn>
>[number];

const statusFilterOptions: FilterOption[] = [
	exhibitorStatusBadge("PENDING", null),
	exhibitorStatusBadge("PENDING", new Date()),
	exhibitorStatusBadge("APPROVED", null),
	exhibitorStatusBadge("REJECTED", null),
	exhibitorStatusBadge("WITHDRAWN", null),
].map((badge) => ({ label: badge.label, value: badge.key }));

function DateCell({ date }: { date: Date | string }) {
	const { formatDate } = useDateFormat();
	return (
		<span className="text-sm text-muted-foreground">
			{formatDate(new Date(date))}
		</span>
	);
}

const columns: ColumnDef<AdminExhibitorRow>[] = [
	{
		id: "company",
		accessorFn: (row) => row.companyName ?? "",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Company"
				textFilter={{ placeholder: "Search..." }}
			/>
		),
		cell: ({ row }) => (
			<Link
				to="/admin/exhibitors/$id"
				params={{ id: row.original.id }}
				className={cn(
					"font-medium hover:underline",
					!row.original.appliedAt && "text-muted-foreground",
				)}
			>
				{row.original.companyName || "—"}
			</Link>
		),
		filterFn: "includesString",
	},
	{
		id: "contact",
		accessorFn: (row) =>
			`${row.user.firstName ?? ""} ${row.user.lastName ?? ""} ${row.user.email}`.trim(),
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Contact"
				textFilter={{ placeholder: "Search..." }}
			/>
		),
		cell: ({ row }) => {
			const { firstName, lastName, email } = row.original.user;
			const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
			return (
				<div
					className={cn(
						"flex flex-col",
						!row.original.appliedAt && "opacity-60",
					)}
				>
					<span className="text-foreground">{name || email}</span>
					{name && (
						<span className="text-xs text-muted-foreground">{email}</span>
					)}
				</div>
			);
		},
		filterFn: "includesString",
	},
	{
		id: "status",
		accessorFn: (row) => exhibitorStatusBadge(row.status, row.appliedAt).key,
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Status"
				filterOptions={statusFilterOptions}
			/>
		),
		cell: ({ row }) => {
			const badge = exhibitorStatusBadge(
				row.original.status,
				row.original.appliedAt,
			);
			return <Badge variant={badge.variant}>{badge.label}</Badge>;
		},
		filterFn: facetedFilterFn,
	},
	{
		id: "appliedAt",
		accessorFn: (row) =>
			row.appliedAt ? new Date(row.appliedAt).getTime() : 0,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Applied" />
		),
		cell: ({ row }) =>
			row.original.appliedAt ? (
				<DateCell date={row.original.appliedAt} />
			) : (
				<span className="text-sm text-muted-foreground">Not applied yet</span>
			),
	},
	{
		id: "presentation",
		accessorFn: (row) => row.submission?.title ?? "",
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title="Presentation"
				textFilter={{ placeholder: "Search..." }}
			/>
		),
		cell: ({ row }) =>
			row.original.submission ? (
				<span className="line-clamp-2 max-w-xs">
					{row.original.submission.title}
				</span>
			) : (
				<span className="text-muted-foreground">No presentation</span>
			),
		filterFn: "includesString",
	},
	{
		id: "fee",
		accessorFn: (row) => (row.user.fee?.paid ? "paid" : "unpaid"),
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Fee" />
		),
		cell: ({ row }) => {
			const fee = row.original.user.fee;
			if (!fee?.paid) {
				return <span className="text-muted-foreground">—</span>;
			}
			return (
				<Badge variant="outline" className="border-green-600 text-green-600">
					{fee.type ?? "Paid"}
				</Badge>
			);
		},
	},
	createActionsColumn<AdminExhibitorRow>({
		getViewLink: (exhibitor) => ({
			to: "/admin/exhibitors/$id",
			params: { id: exhibitor.id },
		}),
	}),
];

const columnLabels: Record<string, string> = {
	company: "Company",
	contact: "Contact",
	status: "Status",
	appliedAt: "Applied",
	presentation: "Presentation",
	fee: "Fee",
};

export function ExhibitorsTable({
	exhibitors,
}: {
	exhibitors: AdminExhibitorRow[];
}) {
	if (exhibitors.length === 0) {
		return (
			<div
				data-testid="exhibitors-table"
				className="flex flex-col items-center justify-center rounded-md border border-dashed py-16 text-center"
			>
				<p className="font-medium">No exhibitors yet</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Exhibitor applications will appear here.
				</p>
			</div>
		);
	}

	return (
		<div data-testid="exhibitors-table">
			<DataTable
				columns={columns}
				data={exhibitors}
				getRowId={(row) => row.id}
				rowDataTestId="exhibitor-row"
				storageKey="admin-exhibitors"
				mobileCard={(exhibitor) => (
					<ExhibitorMobileCard exhibitor={exhibitor} />
				)}
				toolbar={(table) => (
					<DataTableToolbar
						table={table}
						searchKey="company"
						searchPlaceholder="Search exhibitors..."
						columnLabels={columnLabels}
					/>
				)}
			/>
		</div>
	);
}
