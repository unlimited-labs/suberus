import { getCountriesForTimezone } from "countries-and-timezones";

export function detectCountry(): string | undefined {
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const results = getCountriesForTimezone(tz);
		return results[0]?.name;
	} catch {
		return undefined;
	}
}
