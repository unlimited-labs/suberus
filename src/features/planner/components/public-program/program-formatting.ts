import { format, isAfter } from "date-fns";
import type { ProgramItem, TimeGroup } from "./program-types";

export function dayLabelParts(date: Date): {
	weekday: string;
	dayNum: string;
	month: string;
} {
	return {
		weekday: format(date, "EEEE"),
		dayNum: format(date, "dd"),
		month: format(date, "MMMM"),
	};
}

export function formatLongDate(dateStr: string): string {
	return format(new Date(dateStr), "MMMM d, yyyy");
}

function sharesStartTime(group: TimeGroup, item: ProgramItem): boolean {
	return (
		new Date(group.startAt).getTime() === new Date(item.data.startAt).getTime()
	);
}

/** Add an item to an existing time group, extending the group's end if it runs later. */
function appendToGroup(group: TimeGroup, item: ProgramItem): void {
	if (item.kind === "session") group.sessions.push(item.data);
	else group.breaks.push(item.data);

	if (isAfter(new Date(item.data.endAt), new Date(group.endAt))) {
		group.endAt = item.data.endAt;
	}
}

function startNewGroup(item: ProgramItem): TimeGroup {
	return {
		startAt: item.data.startAt,
		endAt: item.data.endAt,
		sessions: item.kind === "session" ? [item.data] : [],
		breaks: item.kind === "break" ? [item.data] : [],
	};
}

/** Group items by start time — parallel sessions share a time header. */
export function buildTimeGroups(items: ProgramItem[]): TimeGroup[] {
	const groups: TimeGroup[] = [];
	for (const it of items) {
		const last = groups[groups.length - 1];
		if (last && sharesStartTime(last, it)) {
			appendToGroup(last, it);
		} else {
			groups.push(startNewGroup(it));
		}
	}
	return groups;
}
