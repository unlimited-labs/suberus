import type { UnscheduledSubmission } from "@/features/planner/server/sessions";
import { lookup } from "@/shared/lib/lookup";
import { cn } from "@/shared/lib/utils";

const TYPE_LABELS = {
	ABSTRACT: "Oral",
	FULL_PAPER: "Paper",
	POSTER: "Poster",
} satisfies Record<string, string>;

/** Short presentation-type label, falling back to the raw type code. */
export function typeLabel(type: string): string {
	return lookup(TYPE_LABELS, type) ?? type;
}

/** First three author names joined, with a "+N" suffix for the rest. */
export function formatAuthorsSummary(
	authors: UnscheduledSubmission["authors"],
): string {
	const names = authors
		.slice(0, 3)
		.map((a) => `${a.firstName} ${a.lastName}`)
		.join(", ");
	const more = authors.length > 3 ? ` +${authors.length - 3}` : "";
	return names + more;
}

/** Row container classes for drag / selected / leaving (collapse-out) states. */
export function submissionRowClassName({
	dragging,
	selected,
	leaving,
}: {
	dragging: boolean;
	selected: boolean;
	leaving: boolean;
}): string {
	return cn(
		"group flex cursor-grab items-start gap-1.5 px-2 py-2 transition-all duration-200 ease-out hover:bg-muted/40 active:cursor-grabbing",
		dragging && "opacity-40",
		selected && "bg-primary/5",
		leaving
			? "pointer-events-none max-h-0 -translate-x-4 overflow-hidden py-0 opacity-0"
			: "max-h-60",
	);
}
