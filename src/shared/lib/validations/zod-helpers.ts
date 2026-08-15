import { z } from "zod";

export const zDateString = z.iso
	.datetime({ offset: true })
	.transform((s) => new Date(s));

/** IANA timezone string ("" allowed as the unset/fallback value). */
export const zIanaTz = z.string().refine((tz) => {
	if (tz === "") return true;
	try {
		new Intl.DateTimeFormat("en", { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}, "Invalid IANA timezone");
