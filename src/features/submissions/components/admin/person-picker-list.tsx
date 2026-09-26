import { IconLoader2, IconSearch, IconUser } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export interface PersonRow {
	id: string;
	name: string;
	email: string;
	affiliation: string | null;
	badges?: ReactNode;
	meta?: ReactNode;
}

export function filterPeople(rows: PersonRow[], search: string): PersonRow[] {
	const term = search.toLowerCase();
	return rows.filter(
		(r) =>
			r.name.toLowerCase().includes(term) ||
			r.email.toLowerCase().includes(term) ||
			(r.affiliation?.toLowerCase().includes(term) ?? false),
	);
}

interface PersonPickerListProps {
	rows: PersonRow[];
	isLoading: boolean;
	search: string;
	onSearchChange: (value: string) => void;
	emptyLabel: string;
	emptySearchLabel: string;
	optionTestId: string;
	actionLabel: string;
	pendingId: string | null;
	onSelect: (id: string) => void;
}

export function PersonPickerList({
	rows,
	isLoading,
	search,
	onSearchChange,
	emptyLabel,
	emptySearchLabel,
	optionTestId,
	actionLabel,
	pendingId,
	onSelect,
}: PersonPickerListProps) {
	return (
		<>
			<div className="relative">
				<IconSearch className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
				<Input
					className="pl-10"
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Search by name, email, or affiliation..."
					value={search}
				/>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-8">
					<IconLoader2 className="text-muted-foreground size-6 animate-spin" />
				</div>
			) : rows.length === 0 ? (
				<p className="text-muted-foreground py-4 text-center text-sm">
					{search ? emptySearchLabel : emptyLabel}
				</p>
			) : (
				<div className="max-h-64 space-y-2 overflow-y-auto">
					{rows.map((row) => (
						<div
							className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3"
							data-testid={optionTestId}
							key={row.id}
						>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<IconUser className="text-muted-foreground size-4 shrink-0" />
									<span className="truncate font-medium">{row.name}</span>
									{row.badges}
								</div>
								<p className="text-muted-foreground truncate pl-6 text-sm">
									{row.email}
								</p>
								{row.affiliation && (
									<p className="text-muted-foreground truncate pl-6 text-xs">
										{row.affiliation}
									</p>
								)}
								{row.meta}
							</div>
							<Button
								disabled={pendingId !== null}
								onClick={() => onSelect(row.id)}
								size="sm"
							>
								{pendingId === row.id ? (
									<IconLoader2 className="size-4 animate-spin" />
								) : (
									actionLabel
								)}
							</Button>
						</div>
					))}
				</div>
			)}
		</>
	);
}
