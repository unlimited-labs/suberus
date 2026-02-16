const DATE_FORMAT_VALUES = [
	"DD.MM.YYYY",
	"DD/MM/YYYY",
	"MM/DD/YYYY",
	"YYYY-MM-DD",
	"DD-MM-YYYY",
	"D MMM YYYY",
	"MMM D, YYYY",
	"D MMMM YYYY",
	"MMMM D, YYYY",
] as const;

export type DateFormatValue = (typeof DATE_FORMAT_VALUES)[number];
export type TimeFormatValue = "24h" | "12h";

export function getDateFormats(
	now = new Date(),
): Array<{ value: DateFormatValue; label: string }> {
	return DATE_FORMAT_VALUES.map((value) => ({
		value,
		label:
			value === "YYYY-MM-DD"
				? `${formatDate(now, value)} (ISO)`
				: formatDate(now, value),
	}));
}

const MONTH_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

const MONTH_LONG = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

function toDate(date: Date | string): Date {
	return typeof date === "string" ? new Date(date) : date;
}

function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

export function formatDate(date: Date | string, format: string): string {
	const d = toDate(date);
	if (Number.isNaN(d.getTime())) return "";

	const day = d.getDate();
	const month = d.getMonth(); // 0-based
	const year = d.getFullYear();

	switch (format) {
		case "DD.MM.YYYY":
			return `${pad(day)}.${pad(month + 1)}.${year}`;
		case "DD/MM/YYYY":
			return `${pad(day)}/${pad(month + 1)}/${year}`;
		case "MM/DD/YYYY":
			return `${pad(month + 1)}/${pad(day)}/${year}`;
		case "YYYY-MM-DD":
			return `${year}-${pad(month + 1)}-${pad(day)}`;
		case "DD-MM-YYYY":
			return `${pad(day)}-${pad(month + 1)}-${year}`;
		case "D MMM YYYY":
			return `${day} ${MONTH_SHORT[month]} ${year}`;
		case "MMM D, YYYY":
			return `${MONTH_SHORT[month]} ${day}, ${year}`;
		case "D MMMM YYYY":
			return `${day} ${MONTH_LONG[month]} ${year}`;
		case "MMMM D, YYYY":
			return `${MONTH_LONG[month]} ${day}, ${year}`;
		default:
			return `${pad(day)}.${pad(month + 1)}.${year}`;
	}
}

export function formatTime(date: Date | string, timeFormat: string): string {
	const d = toDate(date);
	if (Number.isNaN(d.getTime())) return "";

	const hours = d.getHours();
	const minutes = d.getMinutes();

	if (timeFormat === "12h") {
		const h = hours % 12 || 12;
		const ampm = hours < 12 ? "AM" : "PM";
		return `${h}:${pad(minutes)} ${ampm}`;
	}

	return `${pad(hours)}:${pad(minutes)}`;
}

export function formatDateTime(
	date: Date | string,
	dateFormat: string,
	timeFormat: string,
): string {
	const datePart = formatDate(date, dateFormat);
	const timePart = formatTime(date, timeFormat);
	if (!datePart) return "";
	return `${datePart}, ${timePart}`;
}
