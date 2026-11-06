import { z } from "zod";

// Generous ceiling for admin bulk lists; caps zod's per-element issue list, not real use.
export const MAX_BULK_ITEMS = 10_000;

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
