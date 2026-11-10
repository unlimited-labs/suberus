import type { Validator } from "stdnum";
import * as adNrt from "stdnum/lib/cjs/ad/nrt.js";
import * as atUid from "stdnum/lib/cjs/at/uid.js";
import * as beVat from "stdnum/lib/cjs/be/vat.js";
import * as bgVat from "stdnum/lib/cjs/bg/vat.js";
import * as chUid from "stdnum/lib/cjs/ch/uid.js";
import * as cyVat from "stdnum/lib/cjs/cy/vat.js";
import * as czDic from "stdnum/lib/cjs/cz/dic.js";
import * as deVat from "stdnum/lib/cjs/de/vat.js";
import * as dkCvr from "stdnum/lib/cjs/dk/cvr.js";
import * as eeKmkr from "stdnum/lib/cjs/ee/kmkr.js";
import * as esNif from "stdnum/lib/cjs/es/nif.js";
import * as fiAlv from "stdnum/lib/cjs/fi/alv.js";
import * as frTva from "stdnum/lib/cjs/fr/tva.js";
import * as gbVat from "stdnum/lib/cjs/gb/vat.js";
import * as grVat from "stdnum/lib/cjs/gr/vat.js";
import * as hrOib from "stdnum/lib/cjs/hr/oib.js";
import * as huAnum from "stdnum/lib/cjs/hu/anum.js";
import * as ieVat from "stdnum/lib/cjs/ie/vat.js";
import * as itIva from "stdnum/lib/cjs/it/iva.js";
import * as ltPvm from "stdnum/lib/cjs/lt/pvm.js";
import * as luTva from "stdnum/lib/cjs/lu/tva.js";
import * as lvPvn from "stdnum/lib/cjs/lv/pvn.js";
import * as mtVat from "stdnum/lib/cjs/mt/vat.js";
import * as nlBtw from "stdnum/lib/cjs/nl/btw.js";
import * as noOrgnr from "stdnum/lib/cjs/no/orgnr.js";
import * as plNip from "stdnum/lib/cjs/pl/nip.js";
import * as ptNif from "stdnum/lib/cjs/pt/nif.js";
import * as roCif from "stdnum/lib/cjs/ro/cif.js";
import * as seVat from "stdnum/lib/cjs/se/vat.js";
import * as siDdv from "stdnum/lib/cjs/si/ddv.js";
import * as skDph from "stdnum/lib/cjs/sk/dph.js";
import { countryNameToCode } from "@/shared/lib/country-code";
import { lookup } from "@/shared/lib/lookup";

const PREFIX_ALIASES = { GR: "EL" } as const;

// Per-file imports: the package index bundles all ~90 countries into the client.
const CHECKSUM_VALIDATORS = {
	AD: adNrt,
	AT: atUid,
	BE: beVat,
	BG: bgVat,
	CH: chUid,
	CY: cyVat,
	CZ: czDic,
	DE: deVat,
	DK: dkCvr,
	EE: eeKmkr,
	EL: grVat,
	ES: esNif,
	FI: fiAlv,
	FR: frTva,
	GB: gbVat,
	XI: gbVat,
	HR: hrOib,
	HU: huAnum,
	IE: ieVat,
	IT: itIva,
	LT: ltPvm,
	LU: luTva,
	LV: lvPvn,
	MT: mtVat,
	NL: nlBtw,
	NO: noOrgnr,
	PL: plNip,
	PT: ptNif,
	RO: roCif,
	SE: seVat,
	SI: siDdv,
	SK: skDph,
} satisfies Record<string, Validator>;

const MAX_LENGTH = 20;
const UNCHECKED_FORMAT = new RegExp(`^[A-Z0-9 ./-]{2,${MAX_LENGTH}}$`);

type NormalizedVatId = { value: string } | { error: string };

function withAlias(code: string) {
	return lookup(PREFIX_ALIASES, code) ?? code;
}

function countryPrefix(countryName: string | null | undefined) {
	const iso = countryName ? countryNameToCode.get(countryName) : undefined;
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

/** Unknown country stays strict: a missing VAT ID is excused only where VAT IDs don't exist. */
export function vatIdApplies(countryName: string | null | undefined): boolean {
	const iso = countryName ? countryNameToCode.get(countryName) : undefined;
	return !iso || lookup(CHECKSUM_VALIDATORS, withAlias(iso)) !== undefined;
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
