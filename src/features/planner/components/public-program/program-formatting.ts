import { format, isAfter } from "date-fns";
import { dateForPattern } from "@/shared/lib/format-date";
import { zonedDayForPattern } from "@/shared/lib/zoned";
import type { ProgramItem, TimeGroup } from "./program-types";

export interface DayLabel {
	key: string;
	weekday: string;
	dayNum: string;
	month: string;
}

export function dayLabelParts(date: Date, zone: string | undefined): DayLabel {
	const day = zonedDayForPattern(date, zone);
	return {
		key: date.toISOString(),
		weekday: format(day, "EEEE"),
		dayNum: format(day, "dd"),
		month: format(day, "MMMM"),
	};
}

export function formatLongDate(dateStr: string): string {
	return format(dateForPattern(dateStr), "MMMM d, yyyy");
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
