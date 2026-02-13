export const DATE_FORMATS = [
	{ value: "DD.MM.YYYY", label: "13.02.2026" },
	{ value: "DD/MM/YYYY", label: "13/02/2026" },
	{ value: "MM/DD/YYYY", label: "02/13/2026" },
	{ value: "YYYY-MM-DD", label: "2026-02-13 (ISO)" },
	{ value: "DD-MM-YYYY", label: "13-02-2026" },
	{ value: "D MMM YYYY", label: "13 Feb 2026" },
	{ value: "MMM D, YYYY", label: "Feb 13, 2026" },
	{ value: "D MMMM YYYY", label: "13 February 2026" },
	{ value: "MMMM D, YYYY", label: "February 13, 2026" },
] as const;

export type DateFormatValue = (typeof DATE_FORMATS)[number]["value"];
export type TimeFormatValue = "24h" | "12h";

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
