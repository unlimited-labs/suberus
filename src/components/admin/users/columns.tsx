import { Link } from "@tanstack/react-router";
import type { Column, ColumnDef } from "@tanstack/react-table";
import {
	createActionsColumn,
	createSelectColumn,
	DataTableColumnHeader,
	type FilterOption,
	facetedFilterFn,
} from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { formatSurveyAnswerValue, parseMultiSelect } from "@/lib/labels/survey";
import {
	feeFilterOptions,
	formatSubmissionRole,
	roleFilterOptions,
	roleLabels,
} from "@/lib/labels/user";
import type { AdminUser } from "@/lib/server/admin/users";
import { cn } from "@/lib/utils";
import { SubmissionsColumnHeader } from "./submissions-column-header";

export interface SurveyListColumn {
	id: string;
	header: string;
	type: SurveyQuestionType;
	options?: string[];
}

const baseUserColumns: ColumnDef<AdminUser>[] = [
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
];

const actionsColumn = createActionsColumn<AdminUser>({
	getViewLink: (user) => ({
		to: "/admin/users/$id",
		params: { id: user.id },
	}),
	getEditLink: (user) => ({
		to: "/admin/users/$id",
		params: { id: user.id },
	}),
});

/** Raw stored answer value for a survey question, or "" when unanswered. */
function rawAnswer(row: AdminUser, questionId: string): string {
	return (
		row.surveyAnswers.find((a) => a.questionId === questionId)?.value ?? ""
	);
}

/** Build a survey-answer column for the users list, with type-appropriate sort & filter. */
function surveyColumn(col: SurveyListColumn): ColumnDef<AdminUser> {
	const facetOptions: FilterOption[] = (col.options ?? []).map((o) => ({
		label: o,
		value: o,
	}));

	/** Column header with either a faceted filter or a text-search filter. */
	const header =
		(filter: { filterOptions: FilterOption[] } | { textFilter: true }) =>
		({ column }: { column: Column<AdminUser> }) => (
			<DataTableColumnHeader
				column={column}
				title={col.header}
				{...("filterOptions" in filter
					? { filterOptions: filter.filterOptions }
					: { textFilter: { placeholder: "Search..." } })}
			/>
		);

	const textColumn = {
		accessorFn: (row: AdminUser) =>
			formatSurveyAnswerValue(col.type, rawAnswer(row, col.id)),
		header: header({ textFilter: true }),
		filterFn: "includesString",
	} satisfies Partial<ColumnDef<AdminUser>>;

	const base: ColumnDef<AdminUser> = {
		id: `survey-${col.id}`,
		cell: ({ row }) => {
			const answer = row.original.surveyAnswers.find(
				(a) => a.questionId === col.id,
			);
			return (
				<span className="text-muted-foreground">
					{answer ? formatSurveyAnswerValue(col.type, answer.value) : "—"}
				</span>
			);
		},
	};

	switch (col.type) {
		case "CHECKBOX": {
			// Unanswered ("") is a distinct bucket — it stays "—" in the cell and
			// matches neither Yes nor No, rather than being silently filed as "No".
			const yesNo = (v: string) =>
				v === "true" ? "Yes" : v === "false" ? "No" : "";
			return {
				...base,
				accessorFn: (row) => yesNo(rawAnswer(row, col.id)),
				header: header({
					filterOptions: [
						{ label: "Yes", value: "Yes" },
						{ label: "No", value: "No" },
					],
				}),
				filterFn: facetedFilterFn,
			};
		}

		case "SINGLE_SELECT":
			if (!facetOptions.length) return { ...base, ...textColumn };
			return {
				...base,
				accessorFn: (row) => rawAnswer(row, col.id),
				header: header({ filterOptions: facetOptions }),
				filterFn: facetedFilterFn,
			};

		case "MULTI_SELECT":
			if (!facetOptions.length) return { ...base, ...textColumn };
			return {
				...base,
				accessorFn: (row) => parseMultiSelect(rawAnswer(row, col.id)),
				getUniqueValues: (row) => parseMultiSelect(rawAnswer(row, col.id)),
				sortingFn: (a, b) =>
					formatSurveyAnswerValue(
						"MULTI_SELECT",
						rawAnswer(a.original, col.id),
					).localeCompare(
						formatSurveyAnswerValue(
							"MULTI_SELECT",
							rawAnswer(b.original, col.id),
						),
					),
				header: header({ filterOptions: facetOptions }),
				filterFn: "arrIncludesSome",
			};

		default:
			return { ...base, ...textColumn };
	}
}

/** Compose the users-list columns, inserting survey columns before the actions column. */
export function buildUserColumns(
	surveyColumns: SurveyListColumn[] = [],
): ColumnDef<AdminUser>[] {
	return [
		...baseUserColumns,
		...surveyColumns.map(surveyColumn),
		actionsColumn,
	];
}
