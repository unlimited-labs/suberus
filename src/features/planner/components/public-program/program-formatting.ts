import { format, isAfter } from "date-fns";
import { inTz, tzDayStart } from "@/features/planner/tz-datetime";
import type { ProgramItem, TimeGroup } from "./program-types";

export function dayLabelParts(date: Date) {
	return {
		weekday: format(date, "EEEE"),
		dayNum: format(date, "dd"),
		month: format(date, "MMMM"),
	};
}

export function formatLongDate(
	dateStr: string,
	zone: string | undefined,
): string {
	return format(tzDayStart(dateStr, zone), "MMMM d, yyyy", inTz(zone));
}

function sharesStartTime(group: TimeGroup, item: ProgramItem): boolean {
	return (
		new Date(group.startAt).getTime() === new Date(item.data.startAt).getTime()
	);
}

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
