export function createHealthCache<T>(ttlMs: number) {
	let cached: T | null = null;
	let checkedAt = 0;

	return {
		get(): T | null {
			if (cached !== null && Date.now() - checkedAt < ttlMs) {
				return cached;
			}
			return null;
		},
		set(value: T): void {
			cached = value;
			checkedAt = Date.now();
		},
		invalidate(): void {
			cached = null;
			checkedAt = 0;
		},
	};
}
