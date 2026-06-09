/**
 * Neutralize spreadsheet formula injection (CSV/Excel "DDE" injection).
 *
 * A cell whose text begins with `=`, `+`, `-`, `@`, a tab or a carriage return
 * is interpreted as a formula by Excel/LibreOffice/Sheets when the file is
 * opened, letting attacker-controlled input (a registrant's name, an abstract
 * title, a survey answer) run `=HYPERLINK(...)`, `=WEBSERVICE(...)`, etc. We
 * prefix such values with a single quote so they are treated as literal text.
 *
 * Only values that actually start with a dangerous character are touched, so
 * legitimate data is left unchanged.
 */
export function neutralizeFormula(value: string): string {
	if (value.length > 0 && /^[=+\-@\t\r]/.test(value)) {
		return `'${value}`;
	}
	return value;
}
