import { z } from "zod";

// Inlined rather than imported from consola: this is evaluated on the client.
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

// Empty counts as unset: `LOG_LEVEL=` would coerce to 0 and silence all but fatal.
export const logLevel = z
	.string()
	.trim()
	.optional()
	.transform((value) =>
		value ? (LOG_LEVEL_NAMES[value.toLowerCase()] ?? value) : 3,
	)
	.pipe(z.coerce.number());
