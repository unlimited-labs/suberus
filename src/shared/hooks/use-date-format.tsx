import { createContext, type ReactNode, useContext } from "react";
import {
	formatDate as fmtDate,
	formatDateTime as fmtDateTime,
	formatTime as fmtTime,
} from "@/shared/lib/format-date";

interface DateFormatContextValue {
	dateFormat: string;
	timeFormat: string;
}

const DateFormatContext = createContext<DateFormatContextValue>({
	dateFormat: "DD.MM.YYYY",
	timeFormat: "24h",
});

export function DateFormatProvider({
	dateFormat,
	timeFormat,
	children,
}: DateFormatContextValue & { children: ReactNode }) {
	return (
		<DateFormatContext.Provider value={{ dateFormat, timeFormat }}>
			{children}
		</DateFormatContext.Provider>
	);
}

export function useDateFormat() {
	const { dateFormat, timeFormat } = useContext(DateFormatContext);

	return {
		dateFormat,
		timeFormat,
		formatDate: (date: Date | string) => fmtDate(date, dateFormat),
		formatDateTime: (date: Date | string) =>
			fmtDateTime(date, dateFormat, timeFormat),
		formatTime: (date: Date | string) => fmtTime(date, timeFormat),
	};
}
