import { getRequest } from "@tanstack/react-start/server";
import { env } from "@/env";

// ponytail: per-process in-memory window, no eviction. Fine for a single Node
// container; move to the DB or Redis if we ever run more than one replica.
const hits = new Map<string, number[]>();

export function clientKey(): string {
	const forwarded = getRequest().headers.get("x-forwarded-for");
	return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Throttles a public server fn. Disabled outside production for the same reason
 * better-auth's limiter is: no trusted proxy IP to key on in dev/E2E.
 */
export function enforceRateLimit(
	name: string,
	max: number,
	windowMs: number,
): void {
	if (env.NODE_ENV !== "production" || env.E2E) return;
	const key = `${name}:${clientKey()}`;
	const now = Date.now();
	const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	hits.set(key, recent);
	if (recent.length >= max) throw new Error("Too many requests");
	recent.push(now);
}
