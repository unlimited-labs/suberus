import { countries } from "countries-list";
import { euVat, stdnum, type Validator } from "stdnum";
import { lookup } from "@/shared/lib/lookup";

const PREFIX_ALIASES = { GR: "EL" } as const;

const CHECKSUM_VALIDATORS = {
	...Object.fromEntries(
		Object.entries(euVat).map(([code, [validator]]) => [
			lookup(PREFIX_ALIASES, code) ?? code,
			validator,
		]),
	),
	CH: stdnum.CH.uid,
	GB: stdnum.GB.vat,
	XI: stdnum.GB.vat,
	NO: stdnum.NO.orgnr,
} satisfies Record<string, Validator>;

const MAX_LENGTH = 20;
const UNCHECKED_FORMAT = new RegExp(`^[A-Z0-9 ./-]{2,${MAX_LENGTH}}$`);

type NormalizedVatId = { value: string } | { error: string };

function withAlias(code: string) {
	return lookup(PREFIX_ALIASES, code) ?? code;
}

function countryPrefix(countryName: string | null | undefined) {
	const iso = Object.entries(countries).find(
		([, country]) => country.name === countryName,
	)?.[0];
	return iso ? withAlias(iso) : undefined;
}

function splitPrefix(compact: string, countryName: string | null | undefined) {
	const typed = withAlias(compact.slice(0, 2));
	if (lookup(CHECKSUM_VALIDATORS, typed)) {
		return { prefix: typed, body: compact.slice(2) };
	}
	const inferred = countryPrefix(countryName);
	return inferred && lookup(CHECKSUM_VALIDATORS, inferred)
		? { prefix: inferred, body: compact }
		: undefined;
}

// CH and NO numbers carry language/VAT suffixes (MWST, MVA) that are not part of the identifier.
function canonical(prefix: string, body: string) {
	if (prefix === "CH") {
		const uid = `CHE${body.replace(/^E/, "").replace(/(MWST|TVA|IVA|TPV)$/, "")}`;
		return { value: uid, checked: uid };
	}
	if (prefix === "NO") {
		const orgnr = body.replace(/MVA$/, "");
		return { value: `NO${orgnr}`, checked: orgnr };
	}
	return { value: prefix + body, checked: body };
}

export function normalizeVatId(
	raw: string,
	countryName?: string | null,
): NormalizedVatId {
	const trimmed = raw.trim().toUpperCase();
	if (!trimmed) return { value: "" };

	const split = splitPrefix(trimmed.replace(/[\s./-]/g, ""), countryName);
	if (!split) {
		return UNCHECKED_FORMAT.test(trimmed)
			? { value: trimmed }
			: {
					error:
						"VAT ID may use letters, digits, spaces, dots, dashes and slashes, up to 20 characters",
				};
	}

	const { value, checked } = canonical(split.prefix, split.body);
	const result = lookup(CHECKSUM_VALIDATORS, split.prefix)?.validate(checked);
	if (!result?.isValid || value.length > MAX_LENGTH) {
		return { error: `Not a valid ${split.prefix} VAT ID` };
	}
	return { value };
}

export function normalizeVatIdOrThrow(
	raw: string | undefined,
	countryName: string | null | undefined,
): string | undefined {
	if (raw === undefined) return undefined;
	const result = normalizeVatId(raw, countryName);
	if ("error" in result) throw new Response(result.error, { status: 400 });
	return result.value;
}

const VIES_PREFIXES = new Set([
	"AT",
	"BE",
	"BG",
	"CY",
	"CZ",
	"DE",
	"DK",
	"EE",
	"EL",
	"ES",
	"FI",
	"FR",
	"HR",
	"HU",
	"IE",
	"IT",
	"LT",
	"LU",
	"LV",
	"MT",
	"NL",
	"PL",
	"PT",
	"RO",
	"SE",
	"SI",
	"SK",
	"XI",
]);

export function isViesCheckable(normalizedVatId: string): boolean {
	return VIES_PREFIXES.has(normalizedVatId.slice(0, 2));
}

export function isRegistryCheckable(normalizedVatId: string): boolean {
	const prefix = normalizedVatId.slice(0, 2);
	return VIES_PREFIXES.has(prefix) || prefix === "CH" || prefix === "NO";
}

const VAT_CANDIDATE =
	/(\b[A-Z]{2,3}[\s-]?)?(\d[\d\s./-]{6,16}\d(?:\s?(?:MWST|TVA|IVA|MVA))?)/gi;

/** First number in free text that passes a country check digit (prefixed, or bare with `countryName`). */
export function findVatIdInText(
	text: string,
	countryName?: string | null,
): string | undefined {
	for (const [, prefix = "", number] of text.matchAll(VAT_CANDIDATE)) {
		for (const candidate of [prefix + number, number]) {
			const result = normalizeVatId(candidate, countryName);
			if (
				"value" in result &&
				lookup(CHECKSUM_VALIDATORS, result.value.slice(0, 2))
			) {
				return result.value;
			}
		}
	}
	return undefined;
}
