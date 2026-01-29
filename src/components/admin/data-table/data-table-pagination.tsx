import type { Table } from "@tanstack/react-table"
import {
	IconChevronLeft,
	IconChevronRight,
	IconChevronsLeft,
	IconChevronsRight,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
	table: Table<TData>
}

export function DataTablePagination<TData>({
	table,
}: DataTablePaginationProps<TData>) {
	const totalRows = table.getFilteredRowModel().rows.length
	const pageSize = table.getState().pagination.pageSize
	const pageCount = table.getPageCount()

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
			<div className="text-foreground/70 text-sm">
				{table.getSelectedRowModel().rows.length > 0 && (
					<span>
						{table.getSelectedRowModel().rows.length} of {totalRows} row(s)
						selected
					</span>
				)}
			</div>
			<div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
				<div className="flex items-center gap-2">
					<p className="text-sm font-medium text-foreground hidden sm:block">
						Rows per page
					</p>
					<Select
						value={`${pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value))
						}}
					>
						<SelectTrigger className="h-8 w-[70px]">
							<SelectValue placeholder={pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{[10, 20, 30, 40, 50].map((size) => (
								<SelectItem key={size} value={`${size}`}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-center text-sm font-medium text-foreground">
					Page {table.getState().pagination.pageIndex + 1} of {pageCount}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to first page</span>
						<IconChevronsLeft className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to previous page</span>
						<IconChevronLeft className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to next page</span>
						<IconChevronRight className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon-sm"
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to last page</span>
						<IconChevronsRight className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}
