import { cn } from "@/shared/lib/utils";

/** Outer author-card container classes (presenter highlight + drag states). */
export function authorCardClassName({
	isPresenter,
	isDragging,
	isDragOverlay,
}: {
	isPresenter: boolean;
	isDragging: boolean;
	isDragOverlay: boolean;
}): string {
	return cn(
		"group relative rounded-lg border bg-card",
		isPresenter ? "border-primary/30 bg-primary/5" : "border-border/50",
		isDragging && !isDragOverlay && "opacity-0",
		isDragOverlay && "shadow-2xl rotate-2",
	);
}

/** Order-number badge classes. */
export function presenterBadgeClassName(isPresenter: boolean): string {
	return cn(
		"w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold",
		isPresenter
			? "bg-primary/10 text-primary"
			: "bg-muted/50 text-muted-foreground",
	);
}

/** Presenter-toggle button classes. */
export function presenterButtonClassName(isPresenter: boolean): string {
	return cn(
		"flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all",
		isPresenter
			? "text-primary"
			: "text-muted-foreground hover:text-foreground",
	);
}

/** Presenter-toggle visible label. */
export function presenterLabel(isPresenter: boolean): string {
	return isPresenter ? "Presenter" : "Set presenter";
}

/** Presenter-toggle accessible label. */
export function presenterAriaLabel(isPresenter: boolean): string {
	return isPresenter ? "Presenting author" : "Set as presenter";
}

/** Read-only affiliation text shown in the drag overlay. */
export function affiliationDisplay(name: string | null | undefined): string {
	return name || "—";
}
