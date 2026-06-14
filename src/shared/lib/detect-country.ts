import { getCountriesForTimezone } from "countries-and-timezones";

/**
 * Detects the user's country name based on their browser timezone.
 * Returns `undefined` if detection fails.
 */
export function detectCountry(): string | undefined {
	try {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const results = getCountriesForTimezone(tz);
		return results[0]?.name;
	} catch {
		return undefined;
	}
}
