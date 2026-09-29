import { Temporal } from "temporal-polyfill";

type DayInput = Date | string;

export function resolveZone(zone: string | undefined): string {
	return zone || "UTC";
}

function zoned(d: Date, zone: string): Temporal.ZonedDateTime {
	return Temporal.Instant.fromEpochMilliseconds(d.getTime()).toZonedDateTimeISO(
		resolveZone(zone),
	);
}

function toDate(z: Temporal.ZonedDateTime): Date {
	return new Date(z.epochMilliseconds);
}

function plainDay(day: DayInput, zone: string): Temporal.PlainDate {
	return day instanceof Date
		? zoned(day, zone).toPlainDate()
		: Temporal.PlainDate.from(day.slice(0, 10));
}

function dayStart(day: Temporal.PlainDate, zone: string): Date {
	return toDate(day.toZonedDateTime({ timeZone: resolveZone(zone) }));
}

// "compatible": a skipped wall time moves forward, a repeated one takes the first occurrence.
export function wallClockToUtc(local: string, zone: string): Date {
	return toDate(
		Temporal.PlainDateTime.from(local).toZonedDateTime(resolveZone(zone), {
			disambiguation: "compatible",
		}),
	);
}

export function utcToWallClock(d: Date, zone: string): string {
	return zoned(d, zone).toPlainDateTime().toString({ smallestUnit: "minute" });
}

export function startOfDayInZone(day: DayInput, zone: string): Date {
	return dayStart(plainDay(day, zone), zone);
}

export function endOfDayInZone(day: DayInput, zone: string): Date {
	const next = dayStart(plainDay(day, zone).add({ days: 1 }), zone);
	return new Date(next.getTime() - 1);
}

export function withWallTime(d: Date, hhmm: string, zone: string): Date {
	return toDate(zoned(d, zone).withPlainTime(Temporal.PlainTime.from(hhmm)));
}

export function addCalendarDays(d: Date, days: number, zone: string): Date {
	return toDate(zoned(d, zone).add({ days }));
}

export function calendarDaysBetween(
	from: DayInput,
	to: DayInput,
	zone: string,
): number {
	return plainDay(from, zone).until(plainDay(to, zone), { largestUnit: "days" })
		.days;
}

export function sameDayInZone(a: Date, b: Date, zone: string): boolean {
	return plainDay(a, zone).equals(plainDay(b, zone));
}

/** 1 = Monday … 7 = Sunday. */
export function isoWeekday(d: Date, zone: string): number {
	return plainDay(d, zone).dayOfWeek;
}

export function zonedDateString(d: Date, zone: string): string {
	return plainDay(d, zone).toString();
}

export function todayInZone(zone: string, plusDays = 0): string {
	return Temporal.Now.plainDateISO(resolveZone(zone))
		.add({ days: plusDays })
		.toString();
}

export function eachDayInZone(start: Date, end: Date, zone: string): Date[] {
	const last = plainDay(end, zone);
	const days: Date[] = [];
	for (
		let day = plainDay(start, zone);
		Temporal.PlainDate.compare(day, last) <= 0;
		day = day.add({ days: 1 })
	) {
		days.push(dayStart(day, zone));
	}
	return days;
}

export function formatClockTime(d: Date, zone: string): string {
	return zoned(d, zone).toPlainTime().toString({ smallestUnit: "minute" });
}
