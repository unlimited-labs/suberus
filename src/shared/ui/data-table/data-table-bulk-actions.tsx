import type { Table } from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

export interface BulkAction<TData> {
	value: string;
	label: string;
	onExecute: (selectedRows: TData[]) => void | Promise<void>;
}

interface DataTableBulkActionsProps<TData> {
	table: Table<TData>;
	actions: BulkAction<TData>[];
	onActionComplete?: () => void;
}

export function DataTableBulkActions<TData>({
	table,
	actions,
	onActionComplete,
}: DataTableBulkActionsProps<TData>) {
	const [selectedAction, setSelectedAction] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);

	const selectedRows = table.getFilteredSelectedRowModel().rows;
	const selectedCount = selectedRows.length;

	if (selectedCount === 0) return null;

	const handleApply = async () => {
		if (!selectedAction) return;

		const action = actions.find((a) => a.value === selectedAction);
		if (!action) return;

		setIsLoading(true);
		try {
			const data = selectedRows.map((row) => row.original);
			await action.onExecute(data);
			table.resetRowSelection();
			setSelectedAction("");
			onActionComplete?.();
		} catch (_error) {
			toast.error("Action failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm text-muted-foreground">
				{selectedCount} selected
			</span>
			<Select items={actions} value={selectedAction} onValueChange={setSelectedAction}>
				<SelectTrigger className="h-8 w-[180px]">
					<SelectValue placeholder="Bulk actions" />
				</SelectTrigger>
				<SelectContent>
					{actions.map((action) => (
						<SelectItem key={action.value} value={action.value}>
							{action.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button
				size="sm"
				onClick={handleApply}
				disabled={!selectedAction || isLoading}
			>
				{isLoading ? "Applying..." : "Apply"}
			</Button>
		</div>
	);
}
