/** String cells are written as values, never formulas, so neutralizeFormula
 * belongs to the CSV path — here it would ship as data. */
export type XlsxCell = string | number | boolean | Date | null;

interface XlsxAddress {
	r: number;
	c: number;
}

export interface XlsxRange {
	s: XlsxAddress;
	e: XlsxAddress;
}

export interface XlsxSheetSpec {
	name: string;
	rows: XlsxCell[][];
	merges?: XlsxRange[];
	widths?: number[];
	autofilter?: boolean;
	headerRows?: number;
	frozenColumns?: number;
	wrap?: boolean;
	accents?: Array<XlsxAddress & { color: string }>;
}
