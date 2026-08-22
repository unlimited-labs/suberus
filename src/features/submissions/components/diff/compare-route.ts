import { z } from "zod";
import { type CompareLayout, defaultComparePair } from "./version-compare";

export const compareSearchSchema = z.object({
	base: z.coerce.number().int().positive().optional(),
	compare: z.coerce.number().int().positive().optional(),
	view: z.enum(["split", "inline"]).optional(),
});

export function resolveCompare(
	search: { base?: number; compare?: number; view?: CompareLayout },
	versions: Array<{ version: number }>,
	current: number,
) {
	const fallback = defaultComparePair(versions, current);
	return {
		base: search.base ?? fallback.base,
		compare: search.compare ?? fallback.compare,
		layout: search.view ?? "split",
	};
}
