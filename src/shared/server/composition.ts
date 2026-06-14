/**
 * Lazy entry point to the app-shell server composition. Mirrors the pg-boss
 * worker inversion: shared/server stays free of feature imports by reaching the
 * composition module (src/server-composition.ts, NOT a boundary zone) through a
 * dynamic import, resolved once. Server-only.
 */
let registration: Promise<void> | null = null;

export function ensureServerComposition(): Promise<void> {
	if (!registration) {
		registration = import("@/server-composition").then((m) =>
			m.registerServerComposition(),
		);
	}
	return registration;
}
