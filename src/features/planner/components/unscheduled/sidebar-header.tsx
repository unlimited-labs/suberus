import {
	IconBook,
	IconCalendarCheck,
	IconChevronLeft,
	IconLayoutList,
	IconSquareCheck,
} from "@tabler/icons-react";

type ListMode = "unscheduled" | "scheduled";

interface Props {
	mode: ListMode;
	hasItems: boolean;
	selectMode: boolean;
	onToggleMode: () => void;
	onToggleSelectMode: () => void;
	onOpenReader: () => void;
	onCollapse: () => void;
}

export function SidebarHeader({
	mode,
	hasItems,
	selectMode,
	onToggleMode,
	onToggleSelectMode,
	onOpenReader,
	onCollapse,
}: Props) {
	const isScheduled = mode === "scheduled";
	const Icon = isScheduled ? IconCalendarCheck : IconLayoutList;
	const otherLabel = isScheduled ? "Unscheduled" : "Scheduled";
	return (
		<div className="flex items-center justify-between border-b px-3 py-2">
			<button
				aria-pressed={isScheduled}
				className="text-foreground hover:bg-muted flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-medium"
				data-testid="sidebar-toggle-mode"
				onClick={onToggleMode}
				title={`Switch to ${otherLabel}`}
				type="button"
			>
				<Icon className="text-muted-foreground" size={14} />
				<span>{isScheduled ? "Scheduled" : "Unscheduled"}</span>
			</button>
			<div className="flex items-center gap-1">
				{!isScheduled && hasItems && (
					<>
						<button
							aria-pressed={selectMode}
							className={`hover:bg-muted flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium ${
								selectMode
									? "bg-primary/10 text-primary hover:bg-primary/15"
									: "text-muted-foreground hover:text-foreground"
							}`}
							data-testid="sidebar-toggle-select-mode"
							onClick={onToggleSelectMode}
							title={
								selectMode
									? "Exit selection mode (Esc or S)"
									: "Select submissions (S)"
							}
							type="button"
						>
							<IconSquareCheck size={12} />
							Select
						</button>
						<button
							className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium"
							data-testid="sidebar-bulk-read"
							onClick={onOpenReader}
							title="Open reading mode"
							type="button"
						>
							<IconBook size={12} />
							Read
						</button>
					</>
				)}
				<button
					aria-label="Collapse sidebar"
					className="text-muted-foreground hover:bg-muted rounded p-1"
					onClick={onCollapse}
					type="button"
				>
					<IconChevronLeft size={14} />
				</button>
			</div>
		</div>
	);
}
