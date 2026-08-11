import { getRequest } from "@tanstack/react-start/server";
import { env } from "@/env";

// ponytail: per-process in-memory window. Fine for a single Node container;
// move to the DB or Redis if we ever run more than one replica.
const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function clientKey(): string {
	// Last element: the reverse proxy appends the peer address, so everything
	// before it is client-supplied. Assumes exactly one trusted proxy — behind a
	// second one (Cloudflare → nginx) every caller collapses into one bucket.
	const forwarded = getRequest().headers.get("x-forwarded-for");
	return forwarded?.split(",").at(-1)?.trim() || "unknown";
}

function sweep(windowMs: number, now: number): void {
	for (const [key, times] of hits) {
		if (times.every((t) => now - t >= windowMs)) hits.delete(key);
	}
}

/**
 * Reports whether a public server fn may run. Always true outside production
 * and in E2E, for the same reason better-auth's limiter is: no trusted proxy IP
 * to key on there.
 */
export function allowRequest(
	name: string,
	max: number,
	windowMs: number,
): boolean {
	if (env.NODE_ENV !== "production" || env.E2E) return true;
	const key = `${name}:${clientKey()}`;
	const now = Date.now();
	if (hits.size > MAX_KEYS) sweep(windowMs, now);
	const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	if (recent.length >= max) {
		hits.set(key, recent);
		return false;
	}
	recent.push(now);
	hits.set(key, recent);
	return true;
}
