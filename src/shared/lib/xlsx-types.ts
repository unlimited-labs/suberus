import type { Range } from "xlsx";

/** Typed string cells (`t="str"`, no `<f>`): Excel never evaluates these, so
 * neutralizeFormula belongs to the CSV path — here it would ship as data. */
export type XlsxCell = string | number | boolean | Date | null;

export interface XlsxSheetSpec {
	name: string;
	rows: XlsxCell[][];
	merges?: Range[];
	widths?: number[];
	autofilter?: boolean;
}
