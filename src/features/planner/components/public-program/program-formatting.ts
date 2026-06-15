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

/** Group items by start time — parallel sessions share a time header. */
export function buildTimeGroups(items: ProgramItem[]): TimeGroup[] {
	const groups: TimeGroup[] = [];
	for (const it of items) {
		const key = new Date(it.data.startAt).getTime();
		const last = groups[groups.length - 1];
		if (last && new Date(last.startAt).getTime() === key) {
			if (it.kind === "session") last.sessions.push(it.data);
			else last.breaks.push(it.data);
			// Extend group end if this item ends later
			if (isAfter(new Date(it.data.endAt), new Date(last.endAt))) {
				last.endAt = it.data.endAt;
			}
		} else {
			groups.push({
				startAt: it.data.startAt,
				endAt: it.data.endAt,
				sessions: it.kind === "session" ? [it.data] : [],
				breaks: it.kind === "break" ? [it.data] : [],
			});
		}
	}
	return groups;
}
