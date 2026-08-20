import { z } from "zod";
import { lookup } from "@/shared/lib/lookup";

// Inlined rather than imported from consola: this is evaluated on the client.
const LOG_LEVEL_NAMES = {
	silent: -999,
	fatal: 0,
	error: 0,
	warn: 1,
	log: 2,
	info: 3,
	debug: 4,
	trace: 5,
	verbose: 999,
} satisfies Record<string, number | undefined>;

// Empty counts as unset: `LOG_LEVEL=` would coerce to 0 and silence all but fatal.
export const logLevel = z
	.string()
	.trim()
	.optional()
	.transform((value, ctx) => {
		if (!value) return 3;
		const named = lookup(LOG_LEVEL_NAMES, value.toLowerCase());
		if (named !== undefined) return named;
		const numeric = Number(value);
		if (Number.isFinite(numeric)) return numeric;
		ctx.addIssue({
			code: "custom",
			message: `Unknown log level "${value}"; use a consola level name or a number`,
		});
		return z.NEVER;
	});
