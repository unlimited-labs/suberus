import {
	type CellData,
	type Column,
	type ColumnDef,
	columnFacetingFeature,
	columnFilteringFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_arrIncludesSome,
	filterFn_includesString,
	type ReactTable,
	type Row,
	type RowData,
	type Table,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	tableFeatures,
} from "@tanstack/react-table";

// v9 stitches features, row models and the string-name fn registries in statically,
// so DataTable's feature set is also what every ColumnDef in the app is typed against.
export const features = tableFeatures({
	columnFacetingFeature,
	columnFilteringFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
	filterFns: {
		arrIncludesSome: filterFn_arrIncludesSome,
		includesString: filterFn_includesString,
	},
});

export type TableFeatureSet = typeof features;

export type AppColumnDef<
	TData extends RowData,
	TValue extends CellData = CellData,
> = ColumnDef<TableFeatureSet, TData, TValue>;

export type AppColumn<TData extends RowData, TValue = unknown> = Column<
	TableFeatureSet,
	TData,
	TValue
>;

export type AppRow<TData extends RowData> = Row<TableFeatureSet, TData>;

/** What header/cell contexts hand to column defs — the core instance, no `.state`. */
export type AppCoreTable<TData extends RowData> = Table<TableFeatureSet, TData>;

/** The instance DataTable hands to toolbars — carries `.state`, unlike bare `Table`. */
export type AppTable<TData extends RowData> = ReactTable<TableFeatureSet, TData>;
