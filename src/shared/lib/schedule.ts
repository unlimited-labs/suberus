import { z } from "zod";

export const FUTURE_INSTANT_MESSAGE = "Pick a time in the future";

export function isFutureInstant(iso: string, now: Date = new Date()): boolean {
	const at = new Date(iso);
	return !Number.isNaN(at.getTime()) && at.getTime() > now.getTime();
}

export const scheduledAtInput = z.iso
	.datetime()
	.refine((iso) => isFutureInstant(iso), {
		message: FUTURE_INSTANT_MESSAGE,
	})
	.optional();

/** `datetime-local` gives wall-clock with no zone; the browser's zone resolves it. */
export function localInputToIso(local: string): string | null {
	if (!local) return null;
	const at = new Date(local);
	return Number.isNaN(at.getTime()) ? null : at.toISOString();
}
