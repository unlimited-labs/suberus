import { countries } from "countries-list";

/** Official names win over aliases that collide with them. */
export const countryNameToCode = new Map<string, string>();
for (const [code, info] of Object.entries(countries)) {
	for (const alias of info.alias ?? []) countryNameToCode.set(alias, code);
}
for (const [code, info] of Object.entries(countries)) {
	countryNameToCode.set(info.name, code);
}
