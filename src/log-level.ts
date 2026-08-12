import { z } from "zod";

// consola's own levels, inlined rather than imported: this is evaluated on the
// client too, and consola is a server-only dependency.
const LOG_LEVEL_NAMES: Record<string, number> = {
	silent: -999,
	fatal: 0,
	error: 0,
	warn: 1,
	log: 2,
	info: 3,
	debug: 4,
	trace: 5,
	verbose: 999,
};

// An empty value counts as unset: `LOG_LEVEL=` would otherwise coerce to 0 and
// silence everything below fatal.
export const logLevel = z
	.string()
	.trim()
	.optional()
	.transform((value) =>
		value ? (LOG_LEVEL_NAMES[value.toLowerCase()] ?? value) : 3,
	)
	.pipe(z.coerce.number());
