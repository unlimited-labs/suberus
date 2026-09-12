import type { ReactNode } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

export interface BulkAction {
	value: string;
	label: string;
}

interface BulkActionsToolbarProps {
	selectedCount: number;
	actions: BulkAction[];
	value: string;
	onValueChange: (value: string) => void;
	children?: ReactNode;
}

export function BulkActionsToolbar({
	selectedCount,
	actions,
	value,
	onValueChange,
	children,
}: BulkActionsToolbarProps) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-muted-foreground text-sm">
				{selectedCount} selected
			</span>
			<Select items={actions} onValueChange={onValueChange} value={value}>
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
			{children}
		</div>
	);
}
