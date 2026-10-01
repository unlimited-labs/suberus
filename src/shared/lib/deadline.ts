import { endOfDayInZone } from "@/shared/lib/zoned";

export function deadlineCutoff(deadline: string, timezone: string): Date {
	return endOfDayInZone(deadline, timezone);
}

export function isDeadlinePassed(
	deadline: string,
	timezone: string,
	now: Date,
): boolean {
	return now.getTime() > deadlineCutoff(deadline, timezone).getTime();
}
